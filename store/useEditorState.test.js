import { afterEach, expect, test } from "bun:test";
import { DEFAULT_IMAGE_MODEL_ID } from "../lib/image-models";
import { useEditorStore } from "./useEditorState";

const originalFetch = globalThis.fetch;
const SOURCE_ASSET_ID = "11111111-1111-4111-8111-111111111111";

function resetStore() {
  useEditorStore.setState({
    image: null,
    imageRef: null,
    assetId: null,
    imageRefsByImage: {},
    assetIdsByImage: {},
    mask: null,
    prompt: "",
    history: [],
    historyIndex: 0,
    showHistory: false,
    isLoading: false,
    isUploading: false,
    errorMessage: null,
    userFiles: [],
    selectedModelId: DEFAULT_IMAGE_MODEL_ID,
    creditBalance: null,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetStore();
});

test("tracks the provider reference and persistent asset for an uploaded image", () => {
  const image = "blob:http://localhost/source";

  useEditorStore.getState().setImage(image);
  useEditorStore
    .getState()
    .attachImageRef(image, "signed-source-ref", SOURCE_ASSET_ID);

  expect(useEditorStore.getState().imageRef).toBe("signed-source-ref");
  expect(useEditorStore.getState().assetId).toBe(SOURCE_ASSET_ID);
  expect(useEditorStore.getState().imageRefsByImage[image]).toBe(
    "signed-source-ref",
  );
  expect(useEditorStore.getState().assetIdsByImage[image]).toBe(SOURCE_ASSET_ID);
});

test("ignores a file reference that belongs to a stale upload", () => {
  useEditorStore.getState().setImage("blob:http://localhost/current");
  useEditorStore
    .getState()
    .attachImageRef(
      "blob:http://localhost/stale",
      "stale-ref",
      SOURCE_ASSET_ID,
    );

  expect(useEditorStore.getState().imageRef).toBeNull();
  expect(useEditorStore.getState().assetId).toBeNull();
  expect(useEditorStore.getState().imageRefsByImage).toEqual({});
  expect(useEditorStore.getState().assetIdsByImage).toEqual({});
});

test("resets loading and exposes an error after an edit request fails", async () => {
  useEditorStore
    .getState()
    .setImage(
      "blob:http://localhost/source",
      "signed-source-ref",
      SOURCE_ASSET_ID,
    );
  useEditorStore.getState().setPrompt("Make it blue");
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Editing failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

  const generation = useEditorStore.getState().generateEdit();

  expect(useEditorStore.getState().isLoading).toBe(true);
  await expect(generation).rejects.toThrow("Editing failed.");
  expect(useEditorStore.getState().isLoading).toBe(false);
  expect(useEditorStore.getState().errorMessage).toBe("Editing failed.");
});

test("cancels an active edit request with AbortController", async () => {
  const image = "blob:http://localhost/source";
  useEditorStore
    .getState()
    .setImage(image, "signed-source-ref", SOURCE_ASSET_ID);
  useEditorStore.getState().setPrompt("Make it blue");

  let requestSignal;
  let markRequestStarted;
  const requestStarted = new Promise((resolve) => {
    markRequestStarted = resolve;
  });

  globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      requestSignal = init?.signal;
      markRequestStarted();
      requestSignal?.addEventListener(
        "abort",
        () => {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          reject(abortError);
        },
        { once: true },
      );
    });

  const generation = useEditorStore.getState().generateEdit();
  await requestStarted;

  expect(requestSignal).toBeDefined();
  expect(useEditorStore.getState().isLoading).toBe(true);

  useEditorStore.getState().cancelEdit();

  expect(requestSignal.aborted).toBe(true);
  expect(useEditorStore.getState().isLoading).toBe(false);
  await expect(generation).rejects.toThrow("Image edit cancelled.");
  expect(useEditorStore.getState().errorMessage).toBeNull();
  expect(useEditorStore.getState().image).toBe(image);
  expect(useEditorStore.getState().history).toEqual([image]);
});

test("sends the source asset and selected model and tracks server credits", async () => {
  useEditorStore
    .getState()
    .setImage(
      "blob:http://localhost/source",
      "signed-source-ref",
      SOURCE_ASSET_ID,
    );
  useEditorStore.getState().setPrompt("Make it cinematic");
  useEditorStore.getState().setSelectedModelId("gpt-image-2-quality");

  globalThis.fetch = async (_input, init) => {
    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("sourceAssetId")).toBe(SOURCE_ASSET_ID);
    expect(body.get("modelId")).toBe("gpt-image-2-quality");

    return new Response(new Uint8Array([137, 80, 78, 71, 1]), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Image-Reference": "generated-ref",
        "X-Image-Asset-Id": "22222222-2222-4222-8222-222222222222",
        "X-Credits-Remaining": "17",
      },
    });
  };

  await useEditorStore.getState().generateEdit();

  expect(useEditorStore.getState().imageRef).toBe("generated-ref");
  expect(useEditorStore.getState().assetId).toBe(
    "22222222-2222-4222-8222-222222222222",
  );
  expect(useEditorStore.getState().creditBalance).toBe(17);
});

test("ignores out-of-range history indexes", () => {
  useEditorStore
    .getState()
    .setImage(
      "blob:http://localhost/source",
      "source-ref",
      SOURCE_ASSET_ID,
    );
  useEditorStore.getState().setHistoryIndex(99);

  expect(useEditorStore.getState().historyIndex).toBe(0);
  expect(useEditorStore.getState().image).toBe("blob:http://localhost/source");
});

test("new edits after undo discard the redo branch and keep asset lineage", async () => {
  useEditorStore
    .getState()
    .setImage(
      "blob:http://localhost/source",
      "source-ref",
      SOURCE_ASSET_ID,
    );
  useEditorStore.getState().setPrompt("First edit");

  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(new Uint8Array([137, 80, 78, 71, requestCount]), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Image-Reference": `generated-ref-${requestCount}`,
        "X-Image-Asset-Id": `22222222-2222-4222-8222-22222222222${requestCount}`,
      },
    });
  };

  await useEditorStore.getState().generateEdit();
  await useEditorStore.getState().generateEdit();
  expect(useEditorStore.getState().history).toHaveLength(3);

  useEditorStore.getState().undo();
  expect(useEditorStore.getState().historyIndex).toBe(1);

  await useEditorStore.getState().generateEdit();

  expect(useEditorStore.getState().history).toHaveLength(3);
  expect(useEditorStore.getState().historyIndex).toBe(2);
  expect(useEditorStore.getState().imageRef).toBe("generated-ref-3");
  expect(useEditorStore.getState().assetId).toBe(
    "22222222-2222-4222-8222-222222222223",
  );
});
