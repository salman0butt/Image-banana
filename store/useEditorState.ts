import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { editImage } from "@/lib/edit-image";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models";
import { ToolType } from "@/lib/constants";
import type { EditorReferenceFile } from "@/types/editor";

const MAX_HISTORY_ENTRIES = 20;
const REMOVE_BACKGROUND_PROMPT =
  "Remove the background completely. Keep the main subject sharp and unchanged, preserve fine details such as hair and edges, and replace the background with transparency.";
const REFRESH_IMAGE_PROMPT =
  "Refresh and enhance the image while preserving the subject, composition, pose, identity, and overall style. Improve lighting, color balance, sharpness, and fine details without changing the image content.";

type RunEditOptions = {
  prompt: string;
  modelId?: string;
  webSearch?: boolean;
  userFiles?: EditorReferenceFile[];
  aspectRatio?: string;
  mask?: Blob | null;
};

type EditorState = {
  image: string | null;
  imageRef: string | null;
  imageRefsByImage: Record<string, string>;
  mask: Blob | null;
  prompt: string;
  history: string[];
  historyIndex: number;
  showHistory: boolean;
  isLoading: boolean;
  isUploading: boolean;
  errorMessage: string | null;
  userFiles: EditorReferenceFile[];
  selectedTool: ToolType;
  brushSize: number;
  selectedModelId: string;
  creditBalance: number | null;
  setMask: (mask: Blob | null) => void;
  setBrushSize: (size: number) => void;
  setUserFiles: (files: EditorReferenceFile[]) => void;
  setHistoryIndex: (index: number) => void;
  clearHistoryExceptCurrent: () => void;
  undo: () => void;
  redo: () => void;
  setImage: (imageData: string, imageRef?: string | null) => void;
  clearImage: () => void;
  attachImageRef: (imageData: string, imageRef: string) => void;
  setPrompt: (prompt: string) => void;
  setErrorMessage: (message: string | null) => void;
  toggleHistory: () => void;
  setLoading: (val: boolean) => void;
  setUploading: (val: boolean) => void;
  setSelectedModelId: (modelId: string) => void;
  setCreditBalance: (balance: number | null) => void;
  cancelEdit: () => void;
  generateEdit: (options?: { webSearch?: boolean }) => Promise<void>;
  applyFilter: (prompt: string) => Promise<void>;
  removeBackground: () => Promise<void>;
  refreshImage: () => Promise<void>;
  applyExpansion: (aspectRatio: string) => Promise<void>;
  setSelectedTool: (tool: ToolType) => void;
};

function revokeImageUrl(url: string): void {
  if (
    url.startsWith("blob:") &&
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(url);
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Image editing failed.";
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => {
      let activeEditController: AbortController | null = null;

      const requireUploadedImage = () => {
        const { image, imageRef } = get();

        if (!image) {
          throw new Error("Upload an image before editing.");
        }

        if (!imageRef) {
          throw new Error("The image is still uploading. Try again in a moment.");
        }

        return imageRef;
      };

      const commitImage = (image: string, imageRef: string) => {
        const state = get();
        const retainedHistory = state.history.slice(0, state.historyIndex + 1);
        const discardedHistory = state.history.slice(state.historyIndex + 1);
        const nextHistory = [...retainedHistory, image];
        const overflow = Math.max(0, nextHistory.length - MAX_HISTORY_ENTRIES);
        const evictedHistory = nextHistory.slice(0, overflow);
        const boundedHistory = nextHistory.slice(overflow);

        [...discardedHistory, ...evictedHistory].forEach(revokeImageUrl);

        const nextRefs = {
          ...state.imageRefsByImage,
          [image]: imageRef,
        };
        const boundedRefs = Object.fromEntries(
          Object.entries(nextRefs).filter(([url]) => boundedHistory.includes(url)),
        );

        set({
          image,
          imageRef,
          imageRefsByImage: boundedRefs,
          mask: null,
          history: boundedHistory,
          historyIndex: boundedHistory.length - 1,
          userFiles: [],
          errorMessage: null,
        });
      };

      const runEdit = async ({
        prompt,
        modelId,
        webSearch = false,
        userFiles = [],
        aspectRatio = "",
        mask = null,
      }: RunEditOptions) => {
        const normalizedPrompt = prompt.trim();
        if (!normalizedPrompt) {
          const message = "Enter an edit instruction before generating.";
          set({ errorMessage: message });
          throw new Error(message);
        }

        let imageRef: string;
        try {
          imageRef = requireUploadedImage();
        } catch (error) {
          const message = errorMessage(error);
          set({ errorMessage: message });
          throw error;
        }

        activeEditController?.abort();
        const controller = new AbortController();
        activeEditController = controller;
        set({ isLoading: true, errorMessage: null });

        try {
          const result = await editImage({
            imageRef,
            prompt: normalizedPrompt,
            modelId: modelId ?? get().selectedModelId,
            webSearch,
            userFiles,
            aspectRatio,
            mask,
            signal: controller.signal,
          });

          if (activeEditController === controller && !controller.signal.aborted) {
            if (result.creditsRemaining !== null) {
              set({ creditBalance: result.creditsRemaining });
            }
            commitImage(result.imageUrl, result.imageRef);
          } else {
            revokeImageUrl(result.imageUrl);
          }
        } catch (error) {
          if (isAbortError(error)) {
            throw new Error("Image edit cancelled.");
          }

          const message = errorMessage(error);
          set({ errorMessage: message });
          throw error instanceof Error ? error : new Error(message);
        } finally {
          if (activeEditController === controller) {
            activeEditController = null;
            set({ isLoading: false });
          }
        }
      };

      return {
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
        errorMessage: null,
        userFiles: [],
        selectedTool: ToolType.MOVE,
        brushSize: 100,
        selectedModelId: DEFAULT_IMAGE_MODEL_ID,
        creditBalance: null,
        setMask: (mask) => set({ mask }),
        setBrushSize: (brushSize) => set({ brushSize }),
        setSelectedTool: (selectedTool) => set({ selectedTool }),
        setUserFiles: (userFiles) => set({ userFiles }),
        setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
        setCreditBalance: (creditBalance) => set({ creditBalance }),
        setImage: (imageData, imageRef = null) => {
          activeEditController?.abort();
          activeEditController = null;
          const state = get();
          state.history
            .filter((url) => url !== imageData)
            .forEach(revokeImageUrl);

          set(
            {
              image: imageData,
              imageRef,
              imageRefsByImage: imageRef ? { [imageData]: imageRef } : {},
              mask: null,
              history: [imageData],
              historyIndex: 0,
              showHistory: false,
              isLoading: false,
              userFiles: [],
              errorMessage: null,
            },
            false,
            "setImage",
          );
        },
        clearImage: () => {
          activeEditController?.abort();
          activeEditController = null;
          get().history.forEach(revokeImageUrl);
          set({
            image: null,
            imageRef: null,
            imageRefsByImage: {},
            mask: null,
            history: [],
            historyIndex: 0,
            showHistory: false,
            isLoading: false,
            isUploading: false,
            userFiles: [],
          });
        },
        attachImageRef: (imageData, imageRef) =>
          set((state) => {
            if (state.image !== imageData || !state.history.includes(imageData)) {
              return {};
            }

            return {
              imageRef,
              imageRefsByImage: {
                ...state.imageRefsByImage,
                [imageData]: imageRef,
              },
            };
          }),
        setPrompt: (prompt) => set({ prompt }),
        setErrorMessage: (errorMessage) => set({ errorMessage }),
        setHistoryIndex: (index) => {
          const state = get();

          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= state.history.length ||
            index === state.historyIndex
          ) {
            return;
          }

          const image = state.history[index];
          set({
            historyIndex: index,
            image,
            imageRef: state.imageRefsByImage[image] ?? null,
            mask: null,
            errorMessage: null,
          });
        },
        clearHistoryExceptCurrent: () => {
          const state = get();
          const currentImage = state.history[state.historyIndex];
          if (!currentImage) return;

          state.history
            .filter((url) => url !== currentImage)
            .forEach(revokeImageUrl);

          const currentRef = state.imageRefsByImage[currentImage];
          set({
            history: [currentImage],
            historyIndex: 0,
            image: currentImage,
            imageRef: currentRef ?? null,
            imageRefsByImage: currentRef ? { [currentImage]: currentRef } : {},
            mask: null,
          });
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
            history.length ? { showHistory: !showHistory } : {},
          ),
        setLoading: (isLoading) => set({ isLoading }),
        setUploading: (isUploading) => set({ isUploading }),
        cancelEdit: () => {
          const controller = activeEditController;
          if (!controller) return;

          activeEditController = null;
          controller.abort();
          set({ isLoading: false, errorMessage: null });
        },
        generateEdit: async ({ webSearch = false } = {}) => {
          const { prompt, userFiles, mask } = get();
          const finalPrompt = mask
            ? `${prompt}\nEdit only the transparent mask region. Preserve the opaque region.`
            : prompt;

          await runEdit({
            prompt: finalPrompt,
            webSearch,
            userFiles,
            mask,
          });
        },
        applyFilter: (prompt) => runEdit({ prompt }),
        removeBackground: () => runEdit({ prompt: REMOVE_BACKGROUND_PROMPT }),
        refreshImage: () => runEdit({ prompt: REFRESH_IMAGE_PROMPT }),
        applyExpansion: (aspectRatio) => {
          const { prompt } = get();
          const finalPrompt = `Seamlessly extend the image for ${aspectRatio}. Preserve existing subjects, faces, composition, lighting, textures, and perspective.${prompt ? ` ${prompt}` : ""}`;
          return runEdit({ prompt: finalPrompt, aspectRatio });
        },
      };
    },
    { name: "EditorStore" },
  ),
);
