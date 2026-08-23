"use client";

import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { LeftSidebar } from "@/components/left-sidebar";
import ImageGenerationLoading from "@/components/image-generation";
import { AIPromptInput } from "@/components/prompt-input";
import { RightSidebar } from "@/components/right-sidebar";
import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorState";
import ImageEditor from "@/components/image-editor";
import { uploadImage } from "@/lib/upload-image";

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const uploadSequenceRef = useRef(0);
  const {
    image,
    setImage,
    clearImage,
    attachImageRef,
    setUploading,
    setErrorMessage,
    showHistory,
    isLoading,
  } = useEditorStore();

  useEffect(
    () => () => {
      uploadControllerRef.current?.abort();
    },
    [],
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    uploadControllerRef.current?.abort();
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    const sequence = ++uploadSequenceRef.current;

    const previewUrl = URL.createObjectURL(file);
    setImage(previewUrl);
    setUploading(true);
    setErrorMessage(null);

    try {
      const uploaded = await uploadImage(file, controller.signal);

      if (sequence === uploadSequenceRef.current && !controller.signal.aborted) {
        attachImageRef(previewUrl, uploaded.imageRef, uploaded.assetId);
      }
    } catch (error) {
      if (!isAbortError(error) && sequence === uploadSequenceRef.current) {
        const message =
          error instanceof Error ? error.message : "Image upload failed.";
        console.error("Image upload failed:", error);
        clearImage();
        setErrorMessage(message);
      }
    } finally {
      if (sequence === uploadSequenceRef.current) {
        uploadControllerRef.current = null;
        setUploading(false);
      }
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden">
      <input
        id="image-upload-input"
        ref={fileInputRef}
        onChange={handleImageUpload}
        type="file"
        accept="image/*"
        aria-label="Upload image"
        className="hidden"
      />
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <LeftSidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 relative">
          <div className="flex-1 relative overflow-hidden w-full h-full">
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="w-full h-full flex items-center justify-center p-6 md:p-10">
              {!image ? (
                <div className="text-center space-y-6 max-w-sm z-10">
                  <div className="w-24 h-24 bg-zinc-900/50 rounded-3xl border border-zinc-800 flex items-center justify-center mx-auto shadow-2xl shadow-yellow-900/10">
                    <Image
                      src="/logo.png"
                      width={500}
                      height={500}
                      alt="Image's Banana logo"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-100">
                      Start Creating
                    </h1>
                    <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
                      Upload an image to unlock the full potential of{" "}
                      <span className="text-yellow-500 font-medium">
                        Image&apos;s Banana
                      </span>{" "}
                      AI tools.
                    </p>
                  </div>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Select Image
                  </Button>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <ImageEditor />
                </div>
              )}
            </div>

            {isLoading && <ImageGenerationLoading />}
          </div>

          <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 p-4 lg:p-6 z-40">
            <AIPromptInput />
          </div>
        </main>

        {showHistory && <RightSidebar />}
      </div>
    </div>
  );
}
