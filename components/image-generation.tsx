"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/useEditorState";

function ImageGenerationLoading() {
  const cancelEdit = useEditorStore((state) => state.cancelEdit);

  return (
    <div
      className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Generating edited image"
    >
      <Loader2
        className="w-12 h-12 text-yellow-500 animate-spin mb-4"
        aria-hidden="true"
      />
      <h2 className="text-xl font-bold text-white tracking-tight">
        Generating...
      </h2>
      <p className="text-zinc-400 text-sm mt-1">Applying your image edit</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-5 bg-zinc-950 border-zinc-700 text-zinc-200 hover:bg-zinc-900"
        onClick={cancelEdit}
      >
        <X size={14} className="mr-2" aria-hidden="true" />
        Cancel
      </Button>
    </div>
  );
}

export default ImageGenerationLoading;
