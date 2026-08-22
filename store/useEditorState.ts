import { FileUIPart } from "ai";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { editImage } from "@/lib/edit-image";
import { ToolType } from "@/lib/constants";

const REMOVE_BACKGROUND_PROMPT =
  "Remove the background completely. Keep the main subject sharp and unchanged, preserve fine details such as hair and edges, and replace the background with transparency.";
const REFRESH_IMAGE_PROMPT =
  "Refresh and enhance the image while preserving the subject, composition, pose, identity, and overall style. Improve lighting, color balance, sharpness, and fine details without changing the image content.";

type EditorState = {
  image: string | null;
  mask: string | null;
  prompt: string;
  history: string[];
  historyIndex: number;
  showHistory: boolean;
  isLoading: boolean;
  userFiles: FileUIPart[];
  selectedTool: ToolType;
  brushSize: number;
  setMask: (mask: string | null) => void;
  setBrushSize: (size: number) => void;
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
  applyExpansion: (aspectRatio: string) => Promise<void>;
  setSelectedTool: (tool: ToolType) => void;
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => {
      const commitImage = (image: string) =>
        set((state) => ({
          image,
          mask: null,
          history: [...state.history, image],
          historyIndex: state.history.length,
        }));

      return {
      image: null,
      mask: null,
      prompt: "",
      history: [],
      historyIndex: 0,
      showHistory: false,
      isLoading: false,
      userFiles: [],
      selectedTool: ToolType.MOVE,
      brushSize: 100,
      setMask: (mask) => set({ mask }),
      setBrushSize: (brushSize) => set({ brushSize }),
      setSelectedTool: (selectedTool) => set({ selectedTool }),
      setUserFiles: (userFiles) => set({ userFiles }),
      setImage: (imageData: string) =>
        set(
          { image: imageData, mask: null, history: [imageData], historyIndex: 0 },
          false,
          "setImage",
        ),
      setPrompt: (prompt) => set({ prompt }),
      setHistory: (history) => set({ history }),
      setHistoryIndex: (index: number) => {
        const state = get();

        if (index === state.historyIndex) {
          return;
        }

        set({ historyIndex: index, image: state.history[index], mask: null })
      },
      undo: () => {
        const { historyIndex, setHistoryIndex } = get();
        if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
      },
      redo: () => {
        const { historyIndex, history, setHistoryIndex } = get();
        if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
        }
      },
      toggleHistory: () =>
        set(({ history, showHistory }) =>
          history.length ? { showHistory: !showHistory } : {}),
      setLoading: (isLoading) => set({ isLoading }),
      generateEdit: async ({ webSearch = false } = {}) => {
        const { image, prompt, userFiles, mask } = get();
        set({ isLoading: true });

        const finalPrompt = mask
          ? `${prompt}\nEdit only the transparent mask region. Preserve the opaque region.`
          : prompt;

        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt: finalPrompt,
            webSearch,
            userFiles,
            maskBase64: mask,
          });

          commitImage(imageBase64);
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Image editing failed.");
        } finally {
          set({ isLoading: false });
        }
      },
      applyFilter: async (prompt: string) => {
        const { image } = get();
        set({ isLoading: true });

        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt,
          });

          commitImage(imageBase64);
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
        const { image, prompt } = get();
        if (!image) return;

        set({ isLoading: true });

        const finalPrompt = `Seamlessly extend the image for ${aspectRatio}. Preserve existing subjects, faces, composition, lighting, textures, and perspective.${prompt ? ` ${prompt}` : ""}`;
        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt: finalPrompt,
            aspectRatio
          });

          commitImage(imageBase64);
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Image editing failed.");
        } finally {
          set({ isLoading: false });
        }
      },
      };
    },
    { name: "EditorStore" },
  ),
);
