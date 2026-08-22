"use client";

import { GlobeIcon, Loader2, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/store/useEditorState";
import type { EditorReferenceFile } from "@/types/editor";

const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_BYTES = 20 * 1024 * 1024;

type LocalAttachment = {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  url: string;
};

function isAcceptedReference(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AIPromptInput = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const {
    setPrompt,
    generateEdit,
    setUserFiles,
    setErrorMessage,
    errorMessage,
    image,
    isUploading,
    isLoading,
  } = useEditorStore();

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.url);
      }
    },
    [],
  );

  const clearAttachments = () => {
    setAttachments((current) => {
      current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
      return [];
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const availableSlots = Math.max(0, MAX_REFERENCE_FILES - attachments.length);
    if (!availableSlots) {
      setErrorMessage(`Attach at most ${MAX_REFERENCE_FILES} reference files.`);
      return;
    }

    const accepted: LocalAttachment[] = [];
    for (const file of Array.from(files).slice(0, availableSlots)) {
      if (!isAcceptedReference(file)) {
        setErrorMessage("Reference files must be images or PDFs.");
        continue;
      }

      if (!file.size || file.size > MAX_REFERENCE_FILE_BYTES) {
        setErrorMessage("Each reference file must be smaller than 20 MB.");
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        filename: file.name || "reference",
        mediaType: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }

    if (accepted.length) {
      setAttachments((current) => [...current, ...accepted]);
      setErrorMessage(null);
    }

    if (files.length > availableSlots) {
      setErrorMessage(`Attach at most ${MAX_REFERENCE_FILES} reference files.`);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isUploading || isLoading) return;

    const prompt = text.trim();
    if (!image) {
      setErrorMessage("Upload an image before generating.");
      return;
    }

    if (!prompt) {
      setErrorMessage("Enter an edit instruction before generating.");
      return;
    }

    const userFiles: EditorReferenceFile[] = attachments.map((attachment) => ({
      type: "file",
      url: attachment.url,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    }));

    setPrompt(prompt);
    setUserFiles(userFiles);
    setErrorMessage(null);

    try {
      await generateEdit({ webSearch: webSearchEnabled });
      setText("");
      setPrompt("");
      clearAttachments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image edit failed.";
      if (!/cancelled/i.test(message)) {
        console.error("Image edit failed:", error);
      }
    }
  };

  return (
    <div className="size-full">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-zinc-800 bg-zinc-900/70 focus-within:border-zinc-700"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-zinc-800 p-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex max-w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300"
              >
                <Paperclip size={13} aria-hidden="true" />
                <span className="max-w-48 truncate">{attachment.filename}</span>
                <span className="text-zinc-600">{formatBytes(attachment.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label={`Remove ${attachment.filename}`}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Describe the image edit you want..."
          aria-label="Image edit instruction"
          maxLength={8000}
          className="min-h-20 resize-none border-0 bg-transparent text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 p-2.5">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              aria-label="Add reference images or PDFs"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || isLoading || attachments.length >= MAX_REFERENCE_FILES}
              onClick={() => fileInputRef.current?.click()}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <Paperclip size={15} className="mr-1.5" aria-hidden="true" />
              Reference
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={webSearchEnabled}
              disabled={isUploading || isLoading}
              onClick={() => setWebSearchEnabled((enabled) => !enabled)}
              className={
                webSearchEnabled
                  ? "bg-yellow-500/15 text-yellow-400"
                  : "text-zinc-400 hover:text-zinc-100"
              }
            >
              <GlobeIcon size={15} className="mr-1.5" aria-hidden="true" />
              Search
            </Button>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!image || isUploading || isLoading || !text.trim()}
            className="bg-yellow-500 font-semibold text-zinc-950 hover:bg-yellow-400"
          >
            {isUploading || isLoading ? (
              <Loader2 size={15} className="mr-1.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send size={15} className="mr-1.5" aria-hidden="true" />
            )}
            {isUploading ? "Uploading" : isLoading ? "Generating" : "Generate"}
          </Button>
        </div>
      </form>

      {errorMessage && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
