import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo, Sparkle } from "@/components/brand/art";
import { HeroSanta } from "@/components/brand/hero-santa";
import { Snowfall } from "@/components/brand/snowfall";
import { Button } from "@/components/ui/button";

/** How wide Santa renders (matches the wrapper's width below). */
const SANTA_SIZES = "min(80vw, 22rem)";

/**
 * Welcome: one centred column at every screen size, on the same night-forest green as the
 * rest of the game. Bidmas wordmark centred at the top like a nav bar; Santa, the headline,
 * then the one gold action and a quiet link.
 */
export default function WelcomePage() {
  return (
    <>
      {/* The aurora comes from the layout (every page). Extra snow just for the welcome screen,
          on top of the layout's own (different seed so flakes don't overlap). */}
      <Snowfall count={44} seed={1} />

      {/* overflow-x-clip: Santa's lamp glow is wider than a phone screen; never let it scroll sideways. */}
      <div className="relative z-10 flex min-h-dvh flex-col overflow-x-clip">
        {/* Same top nav row as every other page: Bidmas centred on a 44px row. */}
        <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex h-11 items-center justify-center">
            <Logo />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 text-center short:gap-5">
          <div className="relative w-[min(80vw,22rem)] short:w-[min(60vw,15rem)]">
            {/* Warm lamp light behind Santa: gold at the core, deep amber at the edge, slowly breathing. */}
            <div
              aria-hidden
              className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,oklch(85%_0.13_87/0.32)_0%,oklch(77%_0.152_72/0.12)_40%,transparent_70%)] motion-safe:animate-[lamp-breathe_7s_ease-in-out_infinite]"
            />
            <Sparkle className="absolute -left-3 top-6 size-6" />
            <Sparkle className="absolute -right-2 top-1/4 size-4" />
            <HeroSanta
              sizes={SANTA_SIZES}
              priority
              className="relative h-auto w-full origin-bottom motion-safe:animate-[santa-settle_700ms_var(--ease-out-expo)_both]"
            />
          </div>

          <h1 className="max-w-[16ch] text-balance font-display text-[2.25rem] font-bold leading-[1.05] text-fg short:text-[2rem] sm:text-[3rem]">
            Unwrap the Magic of Christmas!
          </h1>

          <div className="flex w-full flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/join">
                Join a room <ArrowRight />
              </Link>
            </Button>
            {/* Secondary action as a plain text link; min-h-11 keeps a 44px thumb target. */}
            <Link
              href="/create"
              className="inline-flex min-h-11 items-center rounded-sm px-4 font-semibold text-fg-muted underline decoration-line-strong decoration-2 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg-faint"
            >
              Create a room
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
