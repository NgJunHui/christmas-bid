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

/** Wordmark: "Bidmas" in gold Fredoka, with a Santa hat tipped on the B (the hat is also the favicon). */
export function Logo({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  const large = size === "lg";
  return (
    <span className={cn("relative inline-flex items-baseline font-display font-bold text-gold", className)}>
      <SantaHat
        className={cn(
          "absolute -rotate-[18deg]",
          large ? "-left-4 -top-7 w-14 sm:-left-5 sm:-top-9 sm:w-[4.5rem]" : "-left-2 -top-3 w-7",
        )}
      />
      <span className={cn(large ? "text-[3.25rem] leading-none sm:text-[4.5rem]" : "text-xl leading-none")}>Bidmas</span>
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

/**
 * Hero character: a cool Santa in sunglasses, drawn flat with soft two-tone
 * shading so it reads as dimensional without photoreal 3D.
 */
export function SantaBust({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 300" aria-hidden className={className}>
      <defs>
        <radialGradient id="santa-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.28" />
          <stop offset="55%" stopColor="var(--color-gold)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* glow behind */}
      <circle cx="140" cy="150" r="140" fill="url(#santa-glow)" />

      {/* coat / shoulders */}
      <path d="M38 300 C 40 238, 82 206, 140 206 C 198 206, 240 238, 242 300 Z" fill="var(--color-holly)" />
      <path d="M190 214 C 222 228, 240 258, 242 300 L 206 300 C 206 262, 198 236, 190 214 Z" fill="var(--color-holly-deep)" />
      {/* fur placket */}
      <rect x="126" y="232" width="28" height="68" rx="10" fill="var(--color-snow)" />
      <rect x="146" y="232" width="8" height="68" rx="4" fill="var(--color-snow-shade)" />
      {/* gold buttons */}
      <circle cx="140" cy="256" r="5" fill="var(--color-gold)" />
      <circle cx="140" cy="280" r="5" fill="var(--color-gold)" />

      {/* face */}
      <ellipse cx="140" cy="150" rx="56" ry="58" fill="var(--color-skin)" />
      <path d="M176 112 C 196 130, 198 170, 180 196 C 186 168, 186 136, 176 112 Z" fill="var(--color-skin-shade)" opacity="0.7" />

      {/* beard */}
      <path
        d="M78 150 C 72 196, 96 236, 140 240 C 184 236, 208 196, 202 150 C 192 170, 176 178, 160 172 C 150 184, 130 184, 120 172 C 104 178, 88 170, 78 150 Z"
        fill="var(--color-snow)"
      />
      <path d="M170 176 C 186 174, 198 162, 202 150 C 206 192, 186 228, 152 238 C 176 222, 186 200, 170 176 Z" fill="var(--color-snow-shade)" />
      {/* smile */}
      <path d="M127 191 Q 140 203 153 191" fill="var(--color-holly-deep)" stroke="var(--color-holly-deep)" strokeWidth="3" strokeLinejoin="round" />
      {/* mustache */}
      <path d="M140 176 C 128 164, 106 166, 98 182 C 112 178, 124 184, 140 182 Z" fill="var(--color-snow)" />
      <path d="M140 176 C 152 164, 174 166, 182 182 C 168 178, 156 184, 140 182 Z" fill="var(--color-snow-shade)" />
      {/* nose */}
      <ellipse cx="140" cy="164" rx="11" ry="9" fill="var(--color-skin-shade)" />
      <circle cx="136" cy="161" r="3" fill="var(--color-skin)" opacity="0.8" />
      {/* cheeks */}
      <circle cx="104" cy="164" r="9" fill="var(--color-ember)" opacity="0.35" />
      <circle cx="176" cy="164" r="9" fill="var(--color-ember)" opacity="0.35" />

      {/* sunglasses */}
      <path d="M86 132 H 194" stroke="var(--color-bg-deep)" strokeWidth="5" strokeLinecap="round" />
      <rect x="90" y="128" width="44" height="28" rx="11" fill="var(--color-bg-deep)" />
      <rect x="146" y="128" width="44" height="28" rx="11" fill="var(--color-bg-deep)" />
      <path d="M98 136 L 112 136" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <path d="M154 136 L 168 136" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      {/* eyebrows peeking */}
      <path d="M96 122 C 106 114, 122 114, 130 120" stroke="var(--color-snow)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M150 120 C 158 114, 174 114, 184 122" stroke="var(--color-snow)" strokeWidth="7" strokeLinecap="round" fill="none" />

      {/* hat */}
      {/* floppy cone, tip drooping to the right */}
      <path d="M78 112 C 80 62, 116 28, 160 28 C 200 28, 228 54, 232 100 C 220 94, 208 98, 202 112 Z" fill="var(--color-holly)" />
      <path d="M160 28 C 200 28, 228 54, 232 100 C 222 95, 212 98, 205 108 C 202 72, 186 44, 160 28 Z" fill="var(--color-holly-deep)" />
      <rect x="72" y="98" width="136" height="30" rx="15" fill="var(--color-snow)" />
      <path d="M180 98 H 193 A 15 15 0 0 1 193 128 H 180 Z" fill="var(--color-snow-shade)" />
      <circle cx="230" cy="104" r="16" fill="var(--color-snow)" />
      <circle cx="235" cy="109" r="9" fill="var(--color-snow-shade)" opacity="0.8" />
    </svg>
  );
}

/** A row of snowy pines for behind the hero character. */
export function SnowyPines({ className, flip = false }: { className?: string; flip?: boolean }) {
  const tree = "M0 100 L 20 70 L 12 70 L 28 45 L 20 45 L 35 20 L 50 45 L 42 45 L 58 70 L 50 70 L 70 100 Z";
  return (
    <svg viewBox="0 0 150 110" aria-hidden className={className} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d={tree} fill="var(--color-snow)" opacity="0.55" transform="translate(70 4) scale(1.05)" />
      <path d={tree} fill="var(--color-snow)" opacity="0.9" transform="translate(0 10)" />
      <path d={tree} fill="var(--color-snow)" opacity="0.75" transform="translate(40 34) scale(0.75)" />
    </svg>
  );
}

/** Rolling snowy ground for the bottom of the hero image. */
export function SnowHill({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden className={className}>
      <path d="M0 42 C 70 18, 130 46, 200 34 C 270 22, 330 8, 400 30 L 400 90 L 0 90 Z" fill="var(--color-snow-shade)" />
      <path d="M0 58 C 60 36, 140 62, 210 50 C 280 38, 340 40, 400 52 L 400 90 L 0 90 Z" fill="var(--color-snow)" />
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
