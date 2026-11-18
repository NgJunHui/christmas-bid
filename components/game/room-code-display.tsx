"use client";

import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Kahoot-style "Join at … with Game PIN" panel. The PIN is four big gold
 * tiles; the small copy icon copies an invite link with the PIN filled in.
 */
export function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Read the PIN out instead!");
    }
  };

  return (
    <section className="card flex w-full max-w-2xl flex-col items-center gap-5 rounded-[2.25rem] px-5 py-6 sm:flex-row sm:justify-between sm:px-8">
      <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
        <p className="flex items-center gap-1.5 text-sm text-fg-muted">
          Join at <span className="font-semibold text-fg">{host ? `${host}/join` : "this site"}</span>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy invite link"
            className="-my-2 grid size-9 place-items-center rounded-full text-gold transition-colors hover:bg-surface-2"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </p>
        <p className="text-eyebrow font-semibold uppercase text-gold/80">with Game PIN</p>
      </div>
      <p className="flex gap-2.5 sm:gap-3" aria-label={`Game PIN ${code.split("").join(" ")}`}>
        {code.split("").map((digit, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: 14, rotate: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid h-[5.25rem] w-[4.25rem] place-items-center rounded-3xl border border-gold/50 bg-bg-deep/70 font-display text-[3.25rem] leading-none text-gold shadow-[0_0_24px_-6px_oklch(85%_0.13_87/0.35)] sm:h-24 sm:w-20 sm:text-[3.75rem]"
          >
            {digit}
          </motion.span>
        ))}
      </p>
    </section>
  );
}
