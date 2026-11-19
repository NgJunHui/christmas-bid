import { ArrowRight, Snowflake } from "lucide-react";
import Link from "next/link";
import { Logo, SnowHill, SnowyPines } from "@/components/brand/art";
import { Button } from "@/components/ui/button";

/**
 * Hero Santa, pre-sized from the 2500px source with sharp into public/hero
 * (vinext has no build-time image pipeline). Largest file is 1200×1107.
 */
const SANTA_WIDTHS = [480, 800, 1200];
const SANTA_SIZES = "(min-width: 1024px) min(34rem, 38vw), min(82vw, 30rem)";
const santaSrcSet = (ext: "avif" | "webp") => SANTA_WIDTHS.map((w) => `/hero/santa-${w}.${ext} ${w}w`).join(", ");

/** Vivid evergreen with soft bokeh, like a lit window on a snowy night. */
const HERO_BACKGROUND = [
  "radial-gradient(circle at 14% 16%, oklch(97% 0.01 95 / 0.16) 0 52px, transparent 54px)",
  "radial-gradient(circle at 78% 52%, oklch(97% 0.01 95 / 0.08) 0 30px, transparent 32px)",
  "radial-gradient(circle at 30% 44%, oklch(97% 0.01 95 / 0.1) 0 12px, transparent 13px)",
  "radial-gradient(circle at 88% 28%, oklch(97% 0.01 95 / 0.5) 0 2px, transparent 3px)",
  "radial-gradient(circle at 8% 40%, oklch(97% 0.01 95 / 0.45) 0 2px, transparent 3px)",
  "radial-gradient(circle at 60% 12%, oklch(97% 0.01 95 / 0.4) 0 1.5px, transparent 2.5px)",
  "radial-gradient(110% 80% at 50% 30%, var(--color-evergreen-light) 0%, var(--color-evergreen) 45%, var(--color-evergreen-deep) 100%)",
].join(", ");

export default function WelcomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-snow lg:grid lg:grid-cols-2">
      {/* Hero: one big picture */}
      <section
        className="relative h-(--hero-h) shrink-0 overflow-hidden [--hero-h:58dvh] short:[--hero-h:54dvh] lg:[--hero-h:100dvh]"
        style={{ backgroundImage: HERO_BACKGROUND }}
      >
        <div className="absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))] z-20 pl-2 pt-3">
          <Logo className="text-snow" />
        </div>
        <Snowflake className="absolute -right-3 -top-3 size-28 rotate-12 text-snow sm:size-32" strokeWidth={2.4} aria-hidden />

        {/* Pines peek out on both sides of Santa, like a little clearing in the woods. */}
        <SnowyPines className="absolute bottom-12 -left-3 w-36 sm:w-44 lg:bottom-20 lg:w-60" />
        <SnowyPines className="absolute bottom-14 -right-2 w-32 sm:w-40 lg:bottom-24 lg:w-56" flip />

        {/*
          Santa sits *on* the snow, in front of the drift, so his boots stay visible.
          Sized by width and by hero height (art is ~1.084:1), so he always clears the logo.
        */}
        <div
          className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 [--santa-max:30rem] sm:bottom-6 lg:bottom-9 lg:[--santa-max:min(34rem,38vw)]"
          style={{ width: "min(82vw, var(--santa-max), calc((var(--hero-h) - 5.5rem) * 1.084))" }}
        >
          {/* Contact shadow pressed into the snow. */}
          <div
            aria-hidden
            className="absolute inset-x-[4%] -bottom-[3%] h-[9%] bg-[radial-gradient(closest-side,oklch(68%_0.045_150/0.6),transparent)]"
          />
          <picture>
            <source type="image/avif" srcSet={santaSrcSet("avif")} sizes={SANTA_SIZES} />
            <img
              src="/hero/santa-800.webp"
              srcSet={santaSrcSet("webp")}
              sizes={SANTA_SIZES}
              width={1200}
              height={1107}
              alt="Santa sitting in the snow beside a sack overflowing with presents"
              fetchPriority="high"
              className="relative h-auto w-full origin-bottom motion-safe:animate-[santa-settle_700ms_var(--ease-out-expo)_both]"
            />
          </picture>
        </div>
        {/* Desktop: the ground lives in the hero. On phones it belongs to the snow section below (no seam). */}
        <SnowHill className="absolute inset-x-0 bottom-0 z-20 hidden h-24 w-full lg:block" />
      </section>

      {/* Copy + the two buttons, on snow */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 bg-snow px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4 text-center short:gap-4 lg:px-12">
        {/* The snowy ground rises out of this section into the hero, so snow and page are one surface. */}
        <SnowHill className="pointer-events-none absolute inset-x-0 -top-16 h-[4.1rem] w-full sm:-top-20 sm:h-[5.1rem] lg:hidden" />
        <div className="flex flex-col items-center gap-2.5">
          <h1 className="max-w-[16ch] text-balance font-display text-[2.25rem] font-bold leading-[1.05] text-ink-green short:text-[2rem] sm:text-[3rem] lg:text-[3.75rem]">
            Unwrap the magic
          </h1>
          <p className="max-w-[30ch] text-[0.9375rem] text-ink-green-soft sm:text-lg">
            Pitch your gift, bid in secret, take something home.
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <Button asChild size="lg" variant="evergreen">
            <Link href="/join">
              Join a room <ArrowRight />
            </Link>
          </Button>
          {/* Secondary action as a plain text link; min-h-12 keeps a 48px thumb target. */}
          <Link
            href="/create"
            className="inline-flex min-h-12 items-center rounded-sm px-4 font-semibold text-evergreen-deep underline decoration-evergreen/40 decoration-2 underline-offset-4 transition-colors hover:decoration-evergreen-deep focus-visible:outline-evergreen-deep"
          >
            Create a room
          </Link>
        </div>
      </section>
    </main>
  );
}
