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
  setMask: (mask: string) => void;
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
  applyExpansion: (aspectRatio: string) => void;
  setSelectedTool: (tool: ToolType) => void;
};

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
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
      setMask: (mask: string) => {
        set({ mask });
      },
      setBrushSize: (size: number) => {
        set({ brushSize: size })
      },
      setSelectedTool: (tool: ToolType) => {
        set({ selectedTool: tool })
      },
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
        const { image, prompt, history, userFiles, mask } = get();
        set({ isLoading: true });

        const finalPrompt = `
        TASK: Professional Image In-painting / Generative Fill.
        ROLE: Expert Photo Retoucher.

        INPUT DATA EXPLANATION:
        - You have received a primary image and a corresponding mask image.
        - The mask defines the precise editing region.
        - TRANSPARENT pixels in the mask indicate the area where you must apply the user's instruction.
        - OPAQUE pixels in the mask must remain exactly as they are in the original image.

        USER GOAL:
        "${prompt}"

        EXECUTION GUIDELINES (CRITICAL):
        1. IF REMOVING/ERASING: If the user asks to "remove", "erase", or "delete" an object, you MUST perform "Background Reconstruction". Analyze the surrounding background (wall, floor, nature) and seamlessly extend it over the masked area to hide the object.
        2. IF CHANGING/REPLACING: If the user asks to add or change something, generate the new object strictly within the white mask, matching the scene's lighting and perspective.
        3. SEAMLESS INTEGRATION: The new content generated inside the white masked area must perfectly match the surrounding environment's perspective, lighting direction, shadows, and color grading.
        4. TEXTURE MATCHING: Replicate the exact film grain, noise level, and sharpness of the original photo to prevent a "pasted-on" look. The transition at the mask boundary must be invisible.
        5. STRICT ISOLATION: Do not modify any pixels outside the designated white masked area under any circumstances`;

        try {
          const imageBase64 = await editImage({
            imageBase64: image,
            prompt: finalPrompt,
            webSearch,
            userFiles,
            maskBase64: mask,
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

        if (!image) return;

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
