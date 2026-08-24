import { afterEach, expect, test } from "bun:test";
import { DEFAULT_IMAGE_MODEL_ID } from "../lib/image-models";
import { useEditorStore } from "./useEditorState";

const originalFetch = globalThis.fetch;

function resetStore() {
  useEditorStore.setState({
    image: null,
    imageRef: null,
    imageRefsByImage: {},
    mask: null,
    prompt: "",
    history: [],
    historyIndex: 0,
    showHistory: false,
    isLoading: false,
    isUploading: false,
    isMaskProcessing: false,
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

test("tracks the signed server reference for an uploaded image", () => {
  const image = "blob:http://localhost/source";

  useEditorStore.getState().setImage(image);
  useEditorStore.getState().attachImageRef(image, "signed-source-ref");

  expect(useEditorStore.getState().imageRef).toBe("signed-source-ref");
  expect(useEditorStore.getState().imageRefsByImage[image]).toBe(
    "signed-source-ref",
  );
});

test("ignores a file reference that belongs to a stale upload", () => {
  useEditorStore.getState().setImage("blob:http://localhost/current");
  useEditorStore
    .getState()
    .attachImageRef("blob:http://localhost/stale", "stale-ref");

  expect(useEditorStore.getState().imageRef).toBeNull();
  expect(useEditorStore.getState().imageRefsByImage).toEqual({});
});

test("resets loading and exposes an error after an edit request fails", async () => {
  useEditorStore
    .getState()
    .setImage("blob:http://localhost/source", "signed-source-ref");
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

test("does not generate while the latest mask is still being encoded", async () => {
  useEditorStore
    .getState()
    .setImage("blob:http://localhost/source", "signed-source-ref");
  useEditorStore.getState().setPrompt("Change only the selection");
  useEditorStore.getState().setMaskProcessing(true);

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  };

  await expect(useEditorStore.getState().generateEdit()).rejects.toThrow(
    "The selection mask is still being prepared.",
  );
  expect(fetchCalled).toBe(false);
  expect(useEditorStore.getState().isLoading).toBe(false);
});

test("cancels an active edit request with AbortController", async () => {
  const image = "blob:http://localhost/source";
  useEditorStore.getState().setImage(image, "signed-source-ref");
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

test("sends the selected model and tracks the server credit balance", async () => {
  useEditorStore
    .getState()
    .setImage("blob:http://localhost/source", "signed-source-ref");
  useEditorStore.getState().setPrompt("Make it cinematic");
  useEditorStore.getState().setSelectedModelId("gpt-image-2-quality");

  globalThis.fetch = async (_input, init) => {
    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("modelId")).toBe("gpt-image-2-quality");

    return new Response(new Uint8Array([137, 80, 78, 71, 1]), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Image-Reference": "generated-ref",
        "X-Credits-Remaining": "17",
      },
    });
  };

  await useEditorStore.getState().generateEdit();

  expect(useEditorStore.getState().imageRef).toBe("generated-ref");
  expect(useEditorStore.getState().creditBalance).toBe(17);
});

test("ignores out-of-range history indexes", () => {
  useEditorStore.getState().setImage("blob:http://localhost/source", "source-ref");
  useEditorStore.getState().setHistoryIndex(99);

  expect(useEditorStore.getState().historyIndex).toBe(0);
  expect(useEditorStore.getState().image).toBe("blob:http://localhost/source");
});

test("new edits after undo discard the redo branch", async () => {
  useEditorStore.getState().setImage("blob:http://localhost/source", "source-ref");
  useEditorStore.getState().setPrompt("First edit");

  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(new Uint8Array([137, 80, 78, 71, requestCount]), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Image-Reference": `generated-ref-${requestCount}`,
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
});
