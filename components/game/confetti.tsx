"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const COLORS = ["var(--color-gold)", "var(--color-holly)", "var(--color-gold-bright)", "var(--color-snow)", "var(--color-gold-deep)"];

/** A short, light burst: 28 paper pieces, ~1.6s, skipped entirely under reduced motion. */
export function Confetti({ pieces = 28 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 520,
        y: 180 + Math.random() * 260,
        rotate: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.15,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        round: i % 5 === 0,
      })),
    [pieces],
  );
  if (reduce) return null;
  return (
    // Fixed and clipped, so pieces never cause horizontal scrolling.
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-[30%]">
      {bits.map((bit) => (
        <motion.span
          key={bit.id}
          className="absolute"
          style={{
            width: bit.w,
            height: bit.round ? bit.w : bit.h,
            background: bit.color,
            borderRadius: bit.round ? 999 : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{
            x: [0, bit.x * 0.6, bit.x],
            y: [0, -bit.y * 0.55, bit.y],
            rotate: bit.rotate,
            opacity: [1, 1, 0],
            scale: 1,
          }}
          transition={{ duration: 1.6, delay: bit.delay, ease: [0.22, 0.61, 0.36, 1], times: [0, 0.35, 1] }}
        />
      ))}
      </div>
    </div>
  );
}
