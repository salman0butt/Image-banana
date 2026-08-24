import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GridItemProps {
  icon?: LucideIcon;
  image?: string;
  label: string;
  desc?: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

const GridItem = ({
  icon: Icon,
  image,
  label,
  desc,
  onClick,
  disabled,
  isActive = false,
}: GridItemProps) => {
  if (image) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onClick}
              disabled={disabled}
              aria-label={label}
              aria-pressed={isActive}
              className={cn(
                "relative h-20 w-full p-0 overflow-hidden rounded-lg border transition-all",
                "bg-zinc-950 border-zinc-800",
                "hover:border-yellow-500 hover:opacity-100",
                disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer opacity-80",
                isActive ? "border-yellow-500 ring-1 ring-yellow-500/50 opacity-100" : "",
              )}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 hover:scale-110"
                style={{ backgroundImage: `url(${image})` }}
                aria-hidden="true"
              />
            </Button>
          </TooltipTrigger>

          <TooltipContent
            side="bottom"
            sideOffset={8}
            className={cn(
              "bg-zinc-950 border border-zinc-800 text-zinc-200",
              "shadow-xl rounded-lg px-3",
              "max-w-50 wrap-break-word z-50",
              "animate-in fade-in-0 zoom-in-95",
            )}
            align="center"
          >
            <p className="font-bold text-xs text-zinc-100">{label}</p>
            {desc && <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{desc}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-3 h-20 w-full rounded-lg border transition-all group",
        "bg-zinc-950 border-zinc-800",
        "hover:border-yellow-500/50 hover:bg-zinc-900",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        isActive ? "border-yellow-500 bg-zinc-900" : "",
      )}
    >
      {Icon && (
        <Icon
          size={20}
          className={cn(
            "transition-colors",
            isActive ? "text-yellow-500" : "text-zinc-500 group-hover:text-yellow-500",
          )}
          aria-hidden="true"
        />
      )}
      <div className="text-center w-full">
        <span
          className={cn(
            "block text-[10px] font-bold transition-colors",
            isActive ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200",
          )}
        >
          {label}
        </span>
        {desc && (
          <span className="block text-[9px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5 truncate w-full">
            {desc}
          </span>
        )}
      </div>
    </Button>
  );
};

export default GridItem;
