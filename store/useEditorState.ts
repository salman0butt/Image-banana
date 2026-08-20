import { FileUIPart } from "ai";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { editImage } from "@/lib/edit-image";

const REMOVE_BACKGROUND_PROMPT =
  "Remove the background completely. Keep the main subject sharp and unchanged, preserve fine details such as hair and edges, and replace the background with transparency.";
const REFRESH_IMAGE_PROMPT =
  "Refresh and enhance the image while preserving the subject, composition, pose, identity, and overall style. Improve lighting, color balance, sharpness, and fine details without changing the image content.";

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
  applyFilter: (prompt: string) => Promise<void>;
  removeBackground: () => Promise<void>;
  refreshImage: () => Promise<void>;
  applyExpansion: (aspectRatio: string) => void;
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
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt,
            webSearch,
            userFiles,
          });

          const clonedHistory = [...history, imageBase64];
          set(
            {
              image: imageBase64,
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
      applyFilter: async (prompt: string) => {
        const { image, history } = get();
        set({ isLoading: true });

        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt,
          });

          set({
            image: imageBase64,
            history: [...history, imageBase64],
            historyIndex: history.length,
          });
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Image editing failed.");
        } finally {
          set({ isLoading: false });
        }
      },
      removeBackground: () => get().applyFilter(REMOVE_BACKGROUND_PROMPT),
      refreshImage: () => get().applyFilter(REFRESH_IMAGE_PROMPT),
      applyExpansion: async (aspectRatio: string) => {
        const { image, history, prompt } = get();
        set({ isLoading: true });

        if(!image) return;

        const baseInstructions = `High-fidelity outpainting. Analyze the visual context of the original image and seamlessly extend
        the scenery into the empty areas. Ensure the person's face and features remain: completely
        unchanged`;

        const technicalConstraint = `Strictly maintain the continuity of existing lines, horizon, textures, lighting, and
        perspective. The transition must be invisible. Do not alter the style or content of the original center image`

        const userContext = prompt ? `Addtional contect/subject for extension: ${prompt}` : "";

        const finalPrompt = `
          ${baseInstructions}
          ${technicalConstraint}
          ${userContext}
        `
        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt: finalPrompt,
            aspectRatio
          });

          set({
            image: imageBase64,
            history: [...history, imageBase64],
            historyIndex: history.length,
          });
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Image editing failed.");
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    { name: "EditorStore" },
  ),
);
