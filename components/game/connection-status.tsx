"use client";

import type { ConnectionStatus as Status } from "@/hooks/use-room-connection";
import { cn } from "@/lib/utils";

const LABEL: Record<Status, string> = {
  connecting: "Connecting",
  open: "Live",
  reconnecting: "Reconnecting",
  closed: "Offline",
};

export function ConnectionStatus({ status, compact = false }: { status: Status; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted" role="status" aria-live="polite">
      <span
        className={cn(
          "size-2 rounded-full",
          status === "open" && "bg-mint shadow-[0_0_8px_var(--color-mint)]",
          (status === "connecting" || status === "reconnecting") && "animate-blink bg-gold",
          status === "closed" && "bg-ember",
        )}
        aria-hidden
      />
      <span className={cn(compact && "sr-only")}>{LABEL[status]}</span>
    </span>
  );
}

/** Small presence dot for a player row. */
export function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", online ? "bg-mint" : "bg-line-strong", className)}
      title={online ? "Online" : "Offline"}
      aria-label={online ? "Online" : "Offline"}
      role="img"
    />
  );
}
