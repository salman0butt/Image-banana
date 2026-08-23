"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CircleUserRound, Download, History, Redo, Undo, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorState";

export function Navbar() {
  const {
    undo,
    redo,
    historyIndex,
    showHistory,
    history,
    image,
    toggleHistory,
  } = useEditorStore();

  const handleUpload = () => {
    const input = document.getElementById("image-upload-input");
    if (input instanceof HTMLInputElement) {
      input.click();
    }
  };

  const handleDownload = () => {
    if (!image) return;

    const link = document.createElement("a");
    link.download = `imagebanana-${Date.now()}.png`;
    link.href = image;
    link.click();
    link.remove();
  };

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <Link
          className="flex items-center gap-2 font-bold text-xl hover:opacity-90 transition-opacity"
          href="/"
          aria-label="Image's Banana home"
        >
          <div className="relative h-11 w-11 overflow-hidden rounded-xl flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Image's Banana logo"
              suppressHydrationWarning
              width={44}
              height={44}
              className="object-cover p-1"
              priority
            />
          </div>
          <span className="text-zinc-100 hidden md:block tracking-tight">
            Image&apos;s<span className="text-yellow-500">Banana</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center bg-zinc-900 rounded-md p-1 border border-zinc-800">
          <Button
            onClick={undo}
            disabled={historyIndex <= 0}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Undo image edit"
            title="Undo"
          >
            <Undo size={15} aria-hidden="true" />
          </Button>

          <div className="h-4 w-px bg-zinc-700 mx-1" aria-hidden="true" />

          <Button
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Redo image edit"
            title="Redo"
          >
            <Redo size={15} aria-hidden="true" />
          </Button>
        </div>

        <div className="h-6 w-px bg-zinc-700 mx-1 md:mx-2" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 px-2.5 md:px-4"
            aria-label="Upload a new image"
          >
            <Upload size={14} className="md:mr-2" aria-hidden="true" />
            <span className="hidden md:inline">Upload</span>
          </Button>

          <Button
            onClick={handleDownload}
            disabled={!image}
            variant="default"
            size="sm"
            className="h-9 bg-yellow-500 text-zinc-950 hover:bg-yellow-400 font-bold px-2.5 md:px-4"
            aria-label="Export current image"
          >
            <span className="hidden md:inline">Export</span>
            <Download size={14} className="md:ml-2" aria-hidden="true" />
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="h-6 w-px bg-zinc-700 mx-2" aria-hidden="true" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHistory}
            disabled={history.length === 0}
            className={cn(
              "h-9 w-9 transition-all duration-200 bg-zinc-800 text-zinc-100 border border-zinc-700",
            )}
            title={showHistory ? "Close history" : "Open history"}
            aria-label={showHistory ? "Close edit history" : "Open edit history"}
            aria-expanded={showHistory}
          >
            {showHistory ? (
              <X aria-hidden="true" />
            ) : (
              <History size={18} aria-hidden="true" />
            )}
          </Button>
        </div>

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Link href="/account" aria-label="Open account" title="Account">
            <CircleUserRound size={18} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
