import { create } from "zustand";
import { devtools } from "zustand/middleware";

type EditorState = {
  image: string | null;
  prompt: string;
  setImage: (imageData: string) => void;
  setPrompt: (prompt: string) => void;
  generateEdit: (options?: { webSearch?: boolean }) => Promise<void>;
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      image: null,
      prompt: "",
      setImage: (imageData) => set({ image: imageData }, false, "setImage"),
      setPrompt: (prompt) => set({ prompt }),
      generateEdit: async ({ webSearch = false } = {}) => {
        const { image, prompt } = get();
        const response = await fetch("/api/edit-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: image,
            prompt,
            webSearch,
          }),
        });
        console.log({
            imageBase64: image,
            prompt,
            webSearch,
          })
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

        set({ image: data.imageBase64 }, false, "setGeneratedImage");
      },
    }),
    { name: "EditorStore" },
  ),
);
