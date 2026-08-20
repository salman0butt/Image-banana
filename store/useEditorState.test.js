import { afterEach, expect, test } from "bun:test";
import { useEditorStore } from "./useEditorState";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useEditorStore.setState({
    image: null,
    prompt: "",
    history: [],
    historyIndex: 0,
    isLoading: false,
  });
});

test("resets loading after an image edit request fails", async () => {
  useEditorStore.getState().setImage("data:image/png;base64,SGVsbG8=");
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
