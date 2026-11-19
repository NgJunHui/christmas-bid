import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/art";

/** Shared frame for the Create and Join screens: no nav bar, just a floating back button. */
export function FormShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col">
      {/* Top nav: back arrow at the far left, Bidmas centred, both on the same 44px row. */}
      <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="relative flex h-11 items-center justify-center">
          <Link
            href="/"
            aria-label="Back to home"
            // Borderless, like the in-game leave button.
            className="absolute left-0 grid size-11 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface/60 hover:text-fg"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Logo />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 sm:pt-14">
        <div className="flex flex-col items-center gap-3 pb-9 text-center">
          {eyebrow ? <p className="text-eyebrow font-semibold uppercase text-gold/80">{eyebrow}</p> : null}
          <h1 className="font-display text-headline text-gold">{title}</h1>
          <p className="max-w-[30ch] text-lg text-fg-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
