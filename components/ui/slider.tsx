"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-10 w-full touch-none select-none items-center data-[disabled]:opacity-40", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 grow overflow-hidden rounded-full bg-surface-3">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-gold-deep to-gold" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-7 rounded-full border-[3px] border-gold bg-fg shadow-[0_2px_10px_oklch(80%_0.15_78/0.45)] transition-transform duration-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 active:scale-110"
        aria-label="Bid amount"
      />
    </SliderPrimitive.Root>
  );
}
