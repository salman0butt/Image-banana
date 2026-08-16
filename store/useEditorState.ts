import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type EditorState = {
    image: string | null;
    prompt: string;
    setImage: (imageData: string) => void;
    setPrompt: (prompt: string) => void;
    generateEdit: () => Promise<void>
}


export const useEditorStore = create<EditorState>()(
    devtools(
        (set, get) => ({
            image: null,
            prompt: '',
            setImage: (imageData: string) => set({ image: imageData }, false, "setImage"),
            generateEdit: async () =>{
                const state = get();
                const response = await fetch('/api/edit-image', {
                    method: 'POST',
                    headers:{
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({imageBase64: state.image, prompt: state.prompt})
                });

                const data = await response.json();

                if(!response.ok){
                    throw new Error(data.details ?? data.error ?? "Gemini image editing failed.");
                }

                if (typeof data.imageBase64 === 'string') {
                    set({ image: data.imageBase64 }, false, "setGeneratedImage");
                }
            },
            setPrompt: (prompt: string) => set({prompt})
        }),
        { name: "EditorStore" },
    ),
)
