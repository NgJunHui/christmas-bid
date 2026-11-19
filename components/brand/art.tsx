import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Four-point sparkle, in gold. */
export function Sparkle({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("text-gold", className)} {...props}>
      <path
        fill="currentColor"
        d="M12 1.5c.5 4.9 2.6 7.9 9 10.5-6.4 2.6-8.5 5.6-9 10.5-.5-4.9-2.6-7.9-9-10.5 6.4-2.6 8.5-5.6 9-10.5Z"
      />
    </svg>
  );
}

/** A small Santa hat, perched on the logo. */
export function SantaHat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden className={className}>
      <path d="M8 40 C 12 18, 30 4, 46 8 C 54 10, 58 18, 56 28 L 50 26 C 48 18, 40 16, 34 22 C 28 28, 26 34, 26 40 Z" fill="var(--color-holly)" />
      <path d="M34 22 C 40 16, 48 18, 50 26 L 56 28 C 58 18, 54 10, 46 8 C 52 14, 50 20, 44 20 C 40 20, 37 21, 34 22 Z" fill="var(--color-holly-deep)" />
      <rect x="4" y="36" width="28" height="12" rx="6" fill="var(--color-snow)" />
      <circle cx="54" cy="31" r="7" fill="var(--color-snow)" />
    </svg>
  );
}

/**
 * Per size: the wordmark's font size, and the hat scaled with it (about 1.4em wide,
 * nudged 0.4em left and 0.6em up) so it always sits tipped on the B.
 */
const LOGO_SIZES = {
  sm: { text: "text-xl", hat: "-left-2 -top-3 w-7" },
  md: { text: "text-[1.875rem]", hat: "-left-3 -top-[1.125rem] w-[2.625rem]" },
  lg: { text: "text-[3.25rem] sm:text-[4.5rem]", hat: "-left-4 -top-7 w-14 sm:-left-5 sm:-top-9 sm:w-[4.5rem]" },
} as const;

/**
 * Wordmark: "Bidmas" in cream Fredoka, with a Santa hat tipped on the B (the hat is also the
 * favicon). Medium cream is the standard everywhere it appears.
 */
export function Logo({ size = "md", className }: { size?: keyof typeof LOGO_SIZES; className?: string }) {
  const { text, hat } = LOGO_SIZES[size];
  return (
    <span className={cn("relative inline-flex items-baseline font-display font-bold text-fg", className)}>
      <SantaHat className={cn("absolute -rotate-[18deg]", hat)} />
      <span className={cn(text, "leading-none")}>Bidmas</span>
    </span>
  );
}

/** Compact mark for tight spaces: a gold bauble with a red cap. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="12.5" y="3" width="7" height="5" rx="1.5" fill="var(--color-holly)" />
      <circle cx="16" cy="18.5" r="11" fill="var(--color-gold)" />
      <path d="M8 15.5 Q 16 19.5 24 15.5" fill="none" stroke="var(--color-gold-deep)" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 21.5 Q 16 25.5 24.5 21.5" fill="none" stroke="var(--color-gold-deep)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="13.5" r="2.2" fill="var(--color-gold-bright)" />
    </svg>
  );
}

/** A small stack of wrapped presents, for the pitch spotlight. */
export function GiftStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 170" aria-hidden className={className}>
      <ellipse cx="100" cy="160" rx="78" ry="8" fill="var(--color-bg-deep)" opacity="0.6" />
      {/* back: red box */}
      <rect x="22" y="78" width="76" height="80" rx="8" fill="var(--color-holly)" />
      <rect x="78" y="78" width="20" height="80" rx="6" fill="var(--color-holly-deep)" />
      <rect x="52" y="78" width="14" height="80" fill="var(--color-snow)" />
      {/* front: green box */}
      <rect x="84" y="58" width="94" height="100" rx="9" fill="var(--color-surface-3)" />
      <rect x="152" y="58" width="26" height="100" rx="7" fill="var(--color-surface-2)" />
      <rect x="84" y="58" width="94" height="22" rx="7" fill="var(--color-line-strong)" />
      <rect x="123" y="58" width="16" height="100" fill="var(--color-gold)" />
      <rect x="84" y="102" width="94" height="14" fill="var(--color-gold)" />
      {/* bow */}
      <path d="M131 58 C 108 30, 86 40, 98 54 C 104 62, 120 60, 131 58 Z" fill="var(--color-gold)" stroke="var(--color-gold-deep)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M131 58 C 154 30, 176 40, 164 54 C 158 62, 142 60, 131 58 Z" fill="var(--color-gold)" stroke="var(--color-gold-deep)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="131" cy="58" r="7" fill="var(--color-gold-deep)" />
      {/* small gold box */}
      <rect x="40" y="122" width="40" height="36" rx="6" fill="var(--color-gold)" />
      <rect x="66" y="122" width="14" height="36" rx="5" fill="var(--color-gold-deep)" />
      <rect x="55" y="122" width="9" height="36" fill="var(--color-holly)" />
    </svg>
  );
}

/** Auction "Sold" stamp for the winner moment. */
export function SoldStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 90" aria-hidden className={className}>
      <rect x="5" y="5" width="190" height="80" rx="14" fill="none" stroke="currentColor" strokeWidth="5" />
      <rect x="14" y="14" width="172" height="62" rx="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <text
        x="100"
        y="63"
        textAnchor="middle"
        fill="currentColor"
        style={{ font: "700 44px var(--font-display)", letterSpacing: "0.1em" }}
      >
        SOLD
      </text>
    </svg>
  );
}
