/**
 * Slow-flowing aurora behind the welcome screen, in the brand palette:
 * - green (dominant): a wide evergreen ribbon from the upper left and a faint mint streak
 *   from the right, like northern lights behind Santa
 * - gold (secondary): a low warm wash on the right, echoing the lamp glow behind Santa
 * - holly (accent): a faint ember in the bottom-left corner, away from the centred text
 * Soft radial gradients (no blur filters, so it's cheap on phones), drifting with transforms
 * only over 22–30s; still under reduced motion. Low opacity, so text keeps its contrast.
 */
const GLOWS = [
  {
    // Evergreen ribbon, upper left, sweeping across behind Santa.
    className: "-left-[30%] -top-[12%] h-[55vh] w-[110vw] -rotate-12 [--aurora-d:24s]",
    color: "oklch(62% 0.14 148 / 0.42), oklch(51% 0.135 150 / 0.16) 55%",
  },
  {
    // Mint aurora streak, upper right.
    className: "-right-[35%] top-[6%] h-[38vh] w-[95vw] rotate-[14deg] [--aurora-d:30s] [animation-direction:reverse]",
    color: "oklch(82% 0.13 158 / 0.17), oklch(82% 0.13 158 / 0.05) 55%",
  },
  {
    // Warm gold wash, low right: lamp light spilling across the floor.
    className: "-right-[25%] -bottom-[18%] h-[50vh] w-[85vw] -rotate-6 [--aurora-d:26s]",
    color: "oklch(77% 0.152 72 / 0.13), oklch(77% 0.152 72 / 0.04) 55%",
  },
  {
    // Holly ember, bottom-left corner: the 10% accent.
    className: "-left-[30%] -bottom-[22%] h-[42vh] w-[75vw] rotate-6 [--aurora-d:22s] [animation-direction:reverse]",
    color: "oklch(54% 0.185 27 / 0.16), oklch(54% 0.185 27 / 0.04) 55%",
  },
];

export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {GLOWS.map((glow, i) => (
        <div
          key={i}
          className={`aurora-glow ${glow.className}`}
          style={{ backgroundImage: `radial-gradient(closest-side, ${glow.color}, transparent)` }}
        />
      ))}
    </div>
  );
}
