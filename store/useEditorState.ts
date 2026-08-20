import { FileUIPart } from "ai";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type EditorState = {
  image: string | null;
  prompt: string;
  history: string[];
  historyIndex: number;
  showHistory: boolean;
  isLoading: boolean;
  userFiles: FileUIPart[];
  setUserFiles: (files: FileUIPart[]) => void;
  setHistoryIndex: (index: number) => void;
  setHistory: (history: string[]) => void;
  undo: () => void;
  redo: () => void;
  setImage: (imageData: string) => void;
  setPrompt: (prompt: string) => void;
  toggleHistory: () => void;
  setLoading: (val: boolean) => void;
  generateEdit: (options?: { webSearch?: boolean }) => Promise<void>;
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      image: null,
      prompt: "",
      history: [],
      historyIndex: 0,
      showHistory: false,
      isLoading: false,
      userFiles: [],
      setUserFiles: (files: FileUIPart[]) => {
        set({
          userFiles: files
        })
      },
      setImage: (imageData: string) =>
        set({ image: imageData, history: [imageData] }, false, "setImage"),
      setPrompt: (prompt) => set({ prompt }),
      setHistory: ((history) => set({ history })),
      setHistoryIndex: (index: number) => {
        const state = get();

        if (index === state.historyIndex) {
          return;
        }

        set({ historyIndex: index, image: state.history[index] })
      },
      undo: () => {
        const state = get();

        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          set({
            image: state.history[newIndex],
            historyIndex: newIndex
          });
        }

      },
      redo: () => {
        const state = get();

        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          set({
            image: state.history[newIndex],
            historyIndex: newIndex
          })
        }

      },
      toggleHistory: () => {
        const state = get();
        if (state.history.length) {
          set({
            showHistory: !state.showHistory
          })
        }

      },
      setLoading: (val: boolean) => {
        set({
          isLoading: val
        })
      },
      generateEdit: async ({ webSearch = false } = {}) => {
        const { image, prompt, history, userFiles } = get();
        set({ isLoading: true });

        try {
          const response = await fetch("/api/edit-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: image,
              prompt,
              webSearch,
              userFiles
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
          set(
            {
              image: data.imageBase64,
              history: clonedHistory,
              historyIndex: history.length,
            },
            false,
            "setGeneratedImage",
          );
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Image editing failed.");
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: "EditorStore" },
  ),
);
