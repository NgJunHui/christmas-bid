"use client";

import { Check, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { RoundView } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { useGame } from "./game-context";

/** Local draft of a bid. The server's accepted value (`myBid`) is the source of truth. */
export function useBidDraft(round: RoundView, credits: number, myBid: number | null, closed: boolean) {
  const { act } = useGame();
  const [amount, setAmount] = useState(() => Math.min(Math.max(1, myBid ?? 1), Math.max(1, credits)));
  const [text, setText] = useState(String(amount));
  const [busy, setBusy] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(0);
  // No reset effect needed: the stage is keyed by attempt ID, so a restart remounts with a fresh draft.

  const set = (value: number) => {
    const next = Math.min(Math.max(1, Math.round(value)), Math.max(1, credits));
    setAmount(next);
    setText(String(next));
  };

  const typed = Number(text);
  const overBalance = text !== "" && typed > credits;
  const invalid = text === "" || !Number.isInteger(typed) || typed < 1 || overBalance;
  const placed = myBid !== null;
  const unchanged = placed && typed === myBid;

  const submit = async () => {
    if (invalid || closed) return;
    setBusy(true);
    const ok = await act({ type: "BID_SUBMIT", roundId: round.id, attemptId: round.attemptId, amount: typed });
    setBusy(false);
    if (ok) setConfirmedAt(Date.now());
  };

  const withdraw = async () => {
    setBusy(true);
    const ok = await act({ type: "BID_WITHDRAW", roundId: round.id, attemptId: round.attemptId });
    setBusy(false);
    if (ok) setConfirmedAt(0);
  };

  return {
    amount,
    text,
    setText: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 5);
      setText(digits);
      if (digits !== "") setAmount(Number(digits));
    },
    normalize: () => (text === "" ? set(amount) : set(Number(text))),
    set,
    credits,
    myBid,
    placed,
    unchanged,
    invalid,
    overBalance,
    busy,
    closed,
    justPlaced: confirmedAt > 0 && Date.now() - confirmedAt < 4000,
    submit,
    withdraw,
  };
}

export type BidDraft = ReturnType<typeof useBidDraft>;

function StepButton({ onClick, disabled, label, children }: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-14 shrink-0 place-items-center rounded-full border border-gold/50 bg-surface/70 text-gold transition-[transform,background-color,border-color] duration-100 hover:border-gold hover:bg-surface-2 active:scale-95 disabled:opacity-30 [&_svg]:size-6"
    >
      {children}
    </button>
  );
}

/** The amount picker: − / number / +, plus a slider for big balances. */
export function BidInput({ draft }: { draft: BidDraft }) {
  const disabled = draft.closed || draft.busy;
  return (
    <div className="card flex w-full flex-col gap-3 rounded-[2rem] px-4 py-5 short:gap-1.5 short:py-3 sm:px-6">
      <p className="text-center font-medium text-fg short:hidden">How many credits is this gift worth to you?</p>
      <div className="flex items-center gap-3">
        <StepButton label="One credit less" onClick={() => draft.set(draft.amount - 1)} disabled={disabled || draft.amount <= 1}>
          <Minus />
        </StepButton>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <label htmlFor="bid-amount" className="sr-only">
            Your bid in credits
          </label>
          <input
            id="bid-amount"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={draft.text}
            onChange={(e) => draft.setText(e.target.value)}
            onBlur={draft.normalize}
            onKeyDown={(e) => {
              if (e.key === "Enter") void draft.submit();
            }}
            disabled={disabled}
            aria-invalid={draft.overBalance}
            aria-describedby="bid-help"
            className={cn(
              "tabular w-full bg-transparent text-center text-[3.5rem] font-bold leading-none tracking-[-0.03em] outline-none disabled:opacity-60",
              draft.overBalance ? "text-ember" : "text-fg",
            )}
          />
          <span className="text-sm font-medium text-fg-muted">credits</span>
        </div>
        <StepButton
          label="One credit more"
          onClick={() => draft.set(draft.amount + 1)}
          disabled={disabled || draft.amount >= draft.credits}
        >
          <Plus />
        </StepButton>
      </div>
      {draft.credits > 1 ? (
        <Slider
          min={1}
          max={draft.credits}
          step={1}
          value={[Math.min(draft.amount, draft.credits)]}
          onValueChange={([value]) => draft.set(value ?? 1)}
          disabled={disabled}
        />
      ) : null}
      <div id="bid-help" className="flex min-h-7 flex-wrap items-center justify-between gap-2 text-sm">
        {draft.overBalance ? (
          <span className="font-medium text-ember" role="alert">
            You only have {draft.credits} credits.
          </span>
        ) : (
          <span className="text-fg-muted">
            Available: <strong className="tabular font-semibold text-gold">{draft.credits}</strong> credits
          </span>
        )}
        {draft.placed ? (
          <span className="tabular rounded-full bg-gold/15 px-3 py-1 font-semibold text-gold">Your bid: {draft.myBid}</span>
        ) : null}
      </div>
    </div>
  );
}

/** The thumb-zone button and its feedback. */
export function BidSubmit({ draft }: { draft: BidDraft }) {
  return (
    <>
      <Button
        size="lg"
        onClick={draft.submit}
        loading={draft.busy}
        disabled={draft.closed || draft.invalid || draft.unchanged}
        // A placed bid is a success state, not a disabled one.
        variant={draft.unchanged && !draft.closed ? "outline" : "primary"}
        className={draft.unchanged && !draft.closed ? "disabled:opacity-100" : undefined}
      >
        {draft.closed ? (
          "Bidding closed"
        ) : draft.unchanged ? (
          <>
            <Check /> Bid placed
          </>
        ) : draft.placed ? (
          "Update bid"
        ) : (
          "Place bid"
        )}
      </Button>
      <AnimatePresence initial={false} mode="wait">
        {draft.placed && !draft.closed ? (
          <motion.p
            key="placed"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-fg-muted"
            role="status"
          >
            {draft.justPlaced ? <strong className="font-semibold text-gold">Bid placed! </strong> : null}
            You can still change it before time runs out.{" "}
            <button
              type="button"
              onClick={draft.withdraw}
              disabled={draft.busy}
              className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg-faint"
            >
              Withdraw
            </button>
          </motion.p>
        ) : (
          <motion.p key="private" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-fg-faint short:hidden">
            Bids stay secret until the timer runs out.
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
