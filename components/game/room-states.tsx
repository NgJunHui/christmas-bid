"use client";

import Link from "next/link";
import { Mark } from "@/components/brand/art";
import { Button } from "@/components/ui/button";

export function RoomLoading({ label = "Finding your seat…" }: { label?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5" aria-busy>
      <div className="flex flex-col items-center gap-4 text-fg-muted">
        <Mark className="size-12 animate-blink" />
        <p className="font-medium" role="status">
          {label}
        </p>
      </div>
    </main>
  );
}

export function RoomGone({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Mark className="size-12 opacity-60 grayscale" />
        <h1 className="font-display text-title text-gold">{title}</h1>
        <p className="text-fg-muted">{message}</p>
        <Button asChild size="lg" className="mt-2 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
