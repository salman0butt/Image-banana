"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Cloud, Loader2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/store/useEditorState";

type PersistentHistoryItem = {
  id: string;
  assetId: string | null;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  modelId: string;
  creditCost: number;
  prompt: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type HistoryResponse = {
  items: PersistentHistoryItem[];
};

type OpenAssetResult = {
  assetId: string;
  imageUrl: string;
  imageRef: string;
};

type OpenAssetInput = {
  assetId: string;
  prompt: string;
};

async function fetchHistory(): Promise<HistoryResponse> {
  const response = await fetch("/api/history", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Unable to load generation history.");
  return (await response.json()) as HistoryResponse;
}

async function openAsset({ assetId }: OpenAssetInput): Promise<OpenAssetResult> {
  const response = await fetch(
    `/api/assets/open?assetId=${encodeURIComponent(assetId)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    let message = "Unable to open the stored image.";
    try {
      const data = (await response.json()) as { error?: { message?: unknown } };
      if (typeof data.error?.message === "string") message = data.error.message;
    } catch {
      // Keep the safe generic message.
    }
    throw new Error(message);
  }

  const imageRef = response.headers.get("x-image-reference");
  const returnedAssetId = response.headers.get("x-image-asset-id");
  if (!imageRef || !returnedAssetId) {
    throw new Error("The stored image response is incomplete.");
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error("The stored image is empty.");

  return {
    assetId: returnedAssetId,
    imageRef,
    imageUrl: URL.createObjectURL(blob),
  };
}

function statusLabel(status: PersistentHistoryItem["status"]): string {
  if (status === "succeeded") return "Ready";
  if (status === "running") return "Processing";
  if (status === "cancelled") return "Cancelled";
  return "Failed";
}

export const RightSidebar = () => {
  const {
    history,
    historyIndex,
    setHistoryIndex,
    clearHistoryExceptCurrent,
    setImage,
    setPrompt,
    setErrorMessage,
  } = useEditorStore();

  const historyQuery = useQuery({
    queryKey: ["generation-history"],
    queryFn: fetchHistory,
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: 1,
  });

  const openMutation = useMutation({
    mutationKey: ["open-history-asset"],
    mutationFn: openAsset,
    onSuccess: (data, input) => {
      setImage(data.imageUrl, data.imageRef, data.assetId);
      setPrompt(input.prompt);
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to open the stored image.",
      );
    },
  });

  const persistentItems = historyQuery.data?.items ?? [];

  return (
    <aside
      className="flex h-full w-64 flex-col shrink-0 border-l border-zinc-800 bg-zinc-950/50 z-20 overflow-hidden"
      aria-label="Generation history"
    >
      <div className="flex-1 min-h-0 w-full">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-5 p-4 pb-4">
            {history.length > 0 && (
              <section aria-labelledby="session-history-title">
                <h2
                  id="session-history-title"
                  className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Session
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {history.map((imageUrl, index) => {
                    const isActive = historyIndex === index;
                    const version = index + 1;

                    return (
                      <div className="relative group" key={imageUrl}>
                        <button
                          type="button"
                          onClick={() => setHistoryIndex(index)}
                          aria-label={`Restore image version ${version}`}
                          aria-pressed={isActive}
                          className={cn(
                            "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200",
                            isActive
                              ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                              : "border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100",
                          )}
                        >
                          <Image
                            width={300}
                            height={300}
                            src={imageUrl}
                            alt={`Image version ${version}`}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        </button>

                        <div
                          className={cn(
                            "absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md z-10 pointer-events-none",
                            isActive
                              ? "bg-yellow-500 text-zinc-950"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700",
                          )}
                          aria-hidden="true"
                        >
                          {version}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section aria-labelledby="persistent-history-title">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2
                  id="persistent-history-title"
                  className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Generation history
                </h2>
                <Cloud size={13} className="text-zinc-600" aria-hidden="true" />
              </div>

              {historyQuery.isLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Loading history
                </div>
              ) : historyQuery.isError ? (
                <div className="space-y-2 py-3">
                  <p className="text-xs text-red-400">Could not load history.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => historyQuery.refetch()}
                    className="h-8 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : persistentItems.length === 0 ? (
                <p className="py-3 text-xs leading-relaxed text-zinc-600">
                  Your generations will appear here and remain available across sessions.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {persistentItems.map((item) => {
                    const canOpen =
                      item.status === "succeeded" &&
                      Boolean(item.assetId) &&
                      Boolean(item.imageUrl);

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50"
                      >
                        {item.imageUrl ? (
                          <button
                            type="button"
                            disabled={!canOpen || openMutation.isPending}
                            onClick={() =>
                              item.assetId &&
                              openMutation.mutate({
                                assetId: item.assetId,
                                prompt: item.prompt,
                              })
                            }
                            className="group relative block aspect-square w-full overflow-hidden bg-zinc-900 disabled:cursor-default"
                            aria-label={`Open saved generation: ${item.prompt}`}
                          >
                            <Image
                              src={item.imageUrl}
                              alt="Saved generated image"
                              width={500}
                              height={500}
                              unoptimized
                              className="h-full w-full object-cover transition group-enabled:group-hover:scale-[1.02]"
                            />
                            {openMutation.isPending && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="flex aspect-[3/2] items-center justify-center bg-zinc-900 px-3 text-center text-xs text-zinc-600">
                            No output image
                          </div>
                        )}

                        <div className="space-y-2 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                item.status === "succeeded"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : item.status === "running"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : item.status === "cancelled"
                                      ? "bg-zinc-700/50 text-zinc-400"
                                      : "bg-red-500/10 text-red-400",
                              )}
                            >
                              {statusLabel(item.status)}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {item.creditCost} credits
                            </span>
                          </div>

                          <p className="line-clamp-2 text-[11px] leading-snug text-zinc-300">
                            {item.prompt}
                          </p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {item.modelId}
                          </p>
                          <p className="text-[10px] text-zinc-600">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                          {item.errorMessage && item.status !== "succeeded" && (
                            <p className="line-clamp-2 text-[10px] leading-snug text-red-400/80">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </div>

      {history.length > 1 && (
        <div className="p-3 border-t border-zinc-800 shrink-0 bg-zinc-950/80 backdrop-blur-sm z-30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg"
                  onClick={clearHistoryExceptCurrent}
                >
                  <Trash2 size={14} className="mr-2" aria-hidden="true" />
                  <span className="text-xs">Clear Session</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Clear local undo history except current</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
};
