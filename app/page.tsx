import { ArrowRight, Snowflake } from "lucide-react";
import Link from "next/link";
import { Logo, SantaFull, SnowHill, SnowyPines } from "@/components/brand/art";
import { Button } from "@/components/ui/button";

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
        aria-label="Santa waving, holding a sack of presents in the snow"
      >
        <div className="absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))] z-20 pl-2 pt-3">
          <Logo className="text-snow" />
        </div>
        <Snowflake className="absolute -right-3 -top-3 size-28 rotate-12 text-snow sm:size-32" strokeWidth={2.4} aria-hidden />

        <SnowyPines className="absolute bottom-14 left-0 w-32 sm:w-40 lg:bottom-20 lg:w-56" />
        <SnowyPines className="absolute bottom-16 right-0 w-28 sm:w-36 lg:bottom-24 lg:w-52" flip />

        {/* Sized by width *and* hero height (art is 300×380), so Santa always fits under the logo. */}
        <div
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 lg:bottom-10"
          style={{ width: "min(80vw, 30rem, calc((var(--hero-h) - 5rem) * 0.79))" }}
        >
          <SantaFull className="h-auto w-full drop-shadow-[0_18px_22px_oklch(25%_0.06_155/0.35)]" />
        </div>
        {/* Desktop: the ground lives in the hero. On phones it belongs to the snow section below (no seam). */}
        <SnowHill className="absolute inset-x-0 bottom-0 z-20 hidden h-24 w-full lg:block" />
      </section>

      {/* Copy + the two buttons, on snow */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 bg-snow px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4 text-center short:gap-4 lg:px-12">
        {/* The snowy ground rises out of this section into the hero, so snow and page are one surface. */}
        <SnowHill className="pointer-events-none absolute inset-x-0 -top-16 h-[4.1rem] w-full sm:-top-20 sm:h-[5.1rem] lg:hidden" />
        <div className="flex flex-col items-center gap-2.5">
          <h1 className="max-w-[16ch] font-display text-[1.875rem] font-bold leading-[1.1] text-ink-green sm:text-[2.5rem] lg:text-[3.25rem]">
            A little Christmas competition!
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
          <Button asChild size="lg" variant="evergreen-outline">
            <Link href="/create">Create a room</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
