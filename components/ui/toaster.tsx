"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      mobileOffset={12}
      duration={3200}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-full border border-gold/40 bg-surface-2 px-5 py-3.5 text-[0.9375rem] font-medium text-fg shadow-[0_12px_32px_-12px_oklch(15%_0.03_166/0.8)] sm:w-[380px]",
          error: "border-ember/60",
          description: "text-fg-muted text-sm",
          icon: "shrink-0 text-gold [&_svg]:size-5",
        },
      }}
    />
  );
}
