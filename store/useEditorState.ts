import { create } from "zustand";
import { devtools } from "zustand/middleware";

type EditorState = {
  image: string | null;
  prompt: string;
  history: string[];
  historyIndex: number;
  setHistoryIndex: (index: number) => void
  setHistory: (history: string[]) => void;
  setImage: (imageData: string) => void;
  setPrompt: (prompt: string) => void;
  generateEdit: (options?: { webSearch?: boolean }) => Promise<void>;
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      image: null,
      prompt: "",
      history: [],
      historyIndex: 0,
      setImage: (imageData: string) =>
        set({ image: imageData, history: [imageData] }, false, "setImage"),
      setPrompt: (prompt) => set({ prompt }),
      setHistory: ((history) => set({history})),
      setHistoryIndex: (index: number) => set({historyIndex: index}),
      generateEdit: async ({ webSearch = false } = {}) => {
        const { image, prompt, history } = get();

        const response = await fetch("/api/edit-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: image,
            prompt,
            webSearch,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const message =
            typeof data.details === "string"
              ? data.details
              : typeof data.error === "string"
                ? data.error
                : "OpenAI image editing failed.";
          throw new Error(message);
        }

        if (typeof data.imageBase64 !== "string" || !data.imageBase64) {
          throw new Error("The API returned no image.");
        }

        const clonedHistory = [...history, data.imageBase64];

        set({ image: data.imageBase64, history: clonedHistory, historyIndex: history.length }, false, "setGeneratedImage");
      },
    }),
    { name: "EditorStore" },
  ),
);
