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
  assetId: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  modelId: string;
  creditCost: number;
  prompt: string;
  createdAt: string;
};

type HistoryResponse = {
  items: PersistentHistoryItem[];
};

type OpenAssetResponse = {
  assetId: string;
  imageUrl: string;
  imageRef: string;
  error?: { message?: string };
};

async function fetchHistory(): Promise<HistoryResponse> {
  const response = await fetch("/api/history", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load generation history.");
  return (await response.json()) as HistoryResponse;
}

async function openAsset(assetId: string): Promise<OpenAssetResponse> {
  const response = await fetch(`/api/assets/open?assetId=${encodeURIComponent(assetId)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json()) as OpenAssetResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Unable to open the stored image.");
  }
  return data;
}

export const RightSidebar = () => {
  const {
    history,
    historyIndex,
    setHistoryIndex,
    clearHistoryExceptCurrent,
    setImage,
    setErrorMessage,
  } = useEditorStore();
  const historyQuery = useQuery({
    queryKey: ["generation-history"],
    queryFn: fetchHistory,
    staleTime: 15_000,
    retry: 1,
  });
  const openMutation = useMutation({
    mutationKey: ["open-history-asset"],
    mutationFn: openAsset,
    onSuccess: (data) => {
      setImage(data.imageUrl, data.imageRef, data.assetId);
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to open the stored image.",
      );
    },
  });
  const persistentItems = historyQuery.data?.items ?? [];

  return (
    <aside
      className="flex h-full w-48 flex-col shrink-0 border-l border-zinc-800 bg-zinc-950/50 z-20 overflow-hidden"
      aria-label="Edit history"
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
                <div className="flex flex-col gap-3">
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
                            width={500}
                            height={500}
                            src={imageUrl}
                            alt={`Image version ${version}`}
                            unoptimized
                            className="w-full h-full object-cover"
                          />

                          {isActive && (
                            <div
                              className="absolute inset-0 bg-yellow-500/5 pointer-events-none"
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        <div
                          className={cn(
                            "absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md z-10 pointer-events-none",
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
                  Recent
                </h2>
                <Cloud size={13} className="text-zinc-600" aria-hidden="true" />
              </div>

              {historyQuery.isLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Loading
                </div>
              ) : historyQuery.isError ? (
                <p className="py-3 text-xs text-red-400">Could not load history.</p>
              ) : persistentItems.length === 0 ? (
                <p className="py-3 text-xs leading-relaxed text-zinc-600">
                  Successful generations will appear here.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {persistentItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={openMutation.isPending}
                      onClick={() => openMutation.mutate(item.assetId)}
                      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 text-left transition hover:border-zinc-600 disabled:opacity-50"
                      aria-label={`Open saved generation: ${item.prompt}`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-zinc-900">
                        <Image
                          src={item.imageUrl}
                          alt="Saved generated image"
                          width={500}
                          height={500}
                          unoptimized
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="space-y-1 p-2">
                        <p className="line-clamp-2 text-[11px] leading-snug text-zinc-300">
                          {item.prompt}
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          {item.creditCost} credits ·{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
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
