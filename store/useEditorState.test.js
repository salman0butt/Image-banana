import { afterEach, expect, test } from "bun:test";
import { useEditorStore } from "./useEditorState";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useEditorStore.setState({
    image: null,
    imageFileId: null,
    fileIdsByImage: {},
    mask: null,
    prompt: "",
    history: [],
    historyIndex: 0,
    isLoading: false,
    isUploading: false,
  });
});

test("tracks the server file ID for an uploaded image", () => {
  const image = "blob:http://localhost/source";

  useEditorStore.getState().setImage(image);
  useEditorStore.getState().attachImageFileId(image, "file-source");

  expect(useEditorStore.getState().imageFileId).toBe("file-source");
  expect(useEditorStore.getState().fileIdsByImage[image]).toBe("file-source");
});

test("resets loading after an image edit request fails", async () => {
  useEditorStore
    .getState()
    .setImage("blob:http://localhost/source", "file-source");
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
});
