"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  GlobeIcon,
  Loader2,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
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

type PublicImageModel = {
  id: string;
  label: string;
  description: string;
  creditCost: number;
};

type ModelsResponse = {
  defaultModelId: string;
  models: PublicImageModel[];
};

type CreditsResponse = {
  balance: number;
};

function isAcceptedReference(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function isCancelledEdit(error: unknown): boolean {
  return error instanceof Error && error.message === "Image edit cancelled.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export const AIPromptInput = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const queryClient = useQueryClient();
  const {
    setPrompt,
    generateEdit,
    cancelEdit,
    setUserFiles,
    setErrorMessage,
    setSelectedModelId,
    setCreditBalance,
    errorMessage,
    image,
    isUploading,
    isLoading,
    selectedModelId,
    creditBalance,
  } = useEditorStore();

  const modelsQuery = useQuery({
    queryKey: ["image-models"],
    queryFn: () => readJson<ModelsResponse>("/api/models"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const creditsQuery = useQuery({
    queryKey: ["credits"],
    queryFn: () => readJson<CreditsResponse>("/api/credits"),
    staleTime: 30_000,
    retry: 1,
  });
  const editMutation = useMutation({
    mutationKey: ["image-edit"],
    mutationFn: ({ webSearch }: { webSearch: boolean }) =>
      generateEdit({ webSearch }),
    retry: false,
    onSuccess: () => {
      const balance = useEditorStore.getState().creditBalance;
      if (balance !== null) {
        queryClient.setQueryData<CreditsResponse>(["credits"], { balance });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["credits"] });
      }
    },
  });
  const isGenerating = isLoading || editMutation.isPending;
  const models = modelsQuery.data?.models ?? [];
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? null;
  const selectedCreditCost = selectedModel?.creditCost ?? null;
  const hasInsufficientCredits =
    creditBalance !== null &&
    selectedCreditCost !== null &&
    creditBalance < selectedCreditCost;

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    if (creditsQuery.data) {
      setCreditBalance(creditsQuery.data.balance);
    }
  }, [creditsQuery.data, setCreditBalance]);

  useEffect(() => {
    const data = modelsQuery.data;
    if (!data?.models.length) return;

    if (!data.models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(data.defaultModelId);
    }
  }, [modelsQuery.data, selectedModelId, setSelectedModelId]);

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

    if (isUploading || isGenerating || hasInsufficientCredits) return;

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
    const submittedText = text;

    setPrompt(prompt);
    setUserFiles(userFiles);
    setErrorMessage(null);

    try {
      await editMutation.mutateAsync({ webSearch: webSearchEnabled });
      setText((current) => (current === submittedText ? "" : current));
      setPrompt("");
      clearAttachments();
    } catch (error) {
      if (isCancelledEdit(error)) {
        editMutation.reset();
        return;
      }

      console.error("Image edit failed:", error);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 p-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              disabled={
                isUploading || isGenerating || attachments.length >= MAX_REFERENCE_FILES
              }
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
              disabled={isUploading || isGenerating}
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

            <select
              aria-label="Image model"
              value={selectedModelId}
              disabled={isUploading || isGenerating || modelsQuery.isLoading}
              onChange={(event) => setSelectedModelId(event.target.value)}
              className="h-8 max-w-52 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
              title={selectedModel?.description ?? "Select image model"}
            >
              {models.length ? (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} · {model.creditCost} credits
                  </option>
                ))
              ) : (
                <option value={selectedModelId}>GPT Image 2 · Fast</option>
              )}
            </select>

            <span
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300"
              title="Available generation credits"
            >
              <Coins size={14} className="text-yellow-400" aria-hidden="true" />
              {creditBalance === null ? "—" : creditBalance} credits
            </span>
          </div>

          {isUploading ? (
            <Button type="button" size="sm" disabled>
              <Loader2 size={15} className="mr-1.5 animate-spin" aria-hidden="true" />
              Uploading
            </Button>
          ) : isGenerating ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelEdit}
              className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <Square size={14} className="mr-1.5 fill-current" aria-hidden="true" />
              Cancel
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!image || !text.trim() || hasInsufficientCredits}
              className="bg-yellow-500 font-semibold text-zinc-950 hover:bg-yellow-400"
              title={
                hasInsufficientCredits
                  ? `This model needs ${selectedCreditCost} credits.`
                  : undefined
              }
            >
              <Send size={15} className="mr-1.5" aria-hidden="true" />
              {hasInsufficientCredits
                ? `Need ${selectedCreditCost} credits`
                : selectedCreditCost !== null
                  ? `Generate · ${selectedCreditCost}`
                  : "Generate"}
            </Button>
          )}
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
