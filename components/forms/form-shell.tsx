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
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh">
      <Link
        href="/"
        aria-label="Back to home"
        className="card fixed left-4 top-4 z-20 grid size-11 place-items-center rounded-full text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20 sm:pt-24">
        <div className="flex justify-center pb-10">
          <Logo />
        </div>
        <div className="flex flex-col items-center gap-3 pb-9 text-center">
          <p className="text-eyebrow font-semibold uppercase text-gold/80">{eyebrow}</p>
          <h1 className="font-display text-headline text-gold">{title}</h1>
          <p className="max-w-[30ch] text-lg text-fg-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
