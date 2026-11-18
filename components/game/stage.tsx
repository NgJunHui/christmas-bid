"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { XmasLoader } from "@/components/brand/xmas-loader";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

/** One phase of the game: content up top, the single primary action pinned to the thumb zone. */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn("flex min-h-full flex-1 flex-col", className)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.14, ease: "easeIn" } }}
      transition={{ duration: 0.38, ease }}
    >
      {children}
    </motion.div>
  );
}

export function StageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-1 flex-col justify-center gap-6 py-6 sm:py-10", className)}>{children}</div>;
}

/** Sticky on phones so the primary action is always reachable without scrolling. */
export function StageActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-5 flex flex-col gap-3 bg-gradient-to-t from-bg from-70% to-transparent px-5 pb-4 pt-6",
        "sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pb-8 sm:pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-eyebrow font-semibold uppercase text-gold/80", className)}>{children}</p>;
}

/** Calm "waiting on someone else" line with a soft three-dot pulse. */
export function WaitingNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "card flex h-14 items-center justify-center gap-3 rounded-full px-5 text-center font-medium text-fg-muted",
        className,
      )}
    >
      <XmasLoader className="shrink-0" />
      {children}
    </p>
  );
}
