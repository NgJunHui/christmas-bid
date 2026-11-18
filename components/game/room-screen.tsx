"use client";

import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { useGameRoom } from "@/hooks/use-game-room";
import type { Phase } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { BidReveal } from "./bid-reveal";
import { BiddingStage } from "./bidding-stage";
import { GameProvider, useGame, type GameContextValue } from "./game-context";
import { NoBidsState } from "./no-bids-state";
import { PitchAnnouncement } from "./pitch-announcement";
import { PlayerList } from "./player-list";
import { RoomMenu } from "./room-menu";
import { RoomGone, RoomLoading } from "./room-states";
import { RoomLobby } from "./room-lobby";
import { WinnerAnnouncement } from "./winner-announcement";
import { WrapUp } from "./wrap-up";

const PHASE_VIEW: Record<Exclude<Phase, "ENDED">, () => ReactNode> = {
  LOBBY: () => <RoomLobby />,
  PITCHING: () => <PitchAnnouncement />,
  BIDDING: () => <BiddingStage />,
  REVEAL: () => <BidReveal />,
  TIEBREAKER: () => <BidReveal />,
  NO_BIDS: () => <NoBidsState />,
  WINNER_CONFIRMED: () => <WinnerAnnouncement />,
  AWAITING_END: () => <WrapUp />,
};

/** Floating status pill, only when something needs attention. */
function StatusPill() {
  const { status, d, view } = useGame();
  const reconnecting = status === "reconnecting" || status === "connecting";
  const hostAway = !d.isHost && !d.host.isConnected;
  const message = reconnecting
    ? "Reconnecting… your seat and bids are safe"
    : hostAway && view.room.phase !== "LOBBY"
      ? "Waiting for the host to reconnect"
      : null;
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key={message}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-[0_8px_24px_-8px_oklch(15%_0.03_166/0.8)]",
            reconnecting ? "border-gold/40 bg-surface-2 text-gold" : "border-line bg-surface-2 text-fg-muted",
          )}
        >
          <WifiOff className="size-4 shrink-0" aria-hidden />
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function Ledger() {
  const { view, d } = useGame();
  return (
    <aside className="hidden lg:block" aria-label="Players and credits">
      <div className="sticky top-6 flex flex-col gap-3 py-10">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-display text-title text-gold">Players</h2>
          <span className="text-sm text-fg-muted">credits</span>
        </div>
        <PlayerList players={view.players} meId={view.me.id} pitcherId={d.round?.pitcherId} mode="ledger" />
        <p className="px-1 text-sm italic text-fg-faint">Balances change only when the host confirms a winner.</p>
      </div>
    </aside>
  );
}

export function RoomScreen({ code }: { code: string }) {
  const router = useRouter();
  const game = useGameRoom(code);
  const { view, derived } = game;
  const phase = view?.room.phase;

  // The game is over: closed rooms go home, finished games go to the results.
  useEffect(() => {
    if (phase !== "ENDED" || !view) return;
    if (view.room.endReason === "CLOSED") {
      if (!view.me.isHost) toast("The host closed the room.");
      router.replace("/");
    } else {
      router.replace(`/room/${code}/results`);
    }
  }, [phase, view, code, router]);

  const value = useMemo<GameContextValue | null>(
    () =>
      view && derived
        ? { code, view, d: derived, act: game.act, clockOffset: game.clockOffset, status: game.status, cause: game.cause }
        : null,
    [code, view, derived, game.act, game.clockOffset, game.status, game.cause],
  );

  if (game.fatal === "not_found" || game.fatal === "expired") {
    return <RoomGone title="This room has closed" message="Rooms tidy themselves up a day after the last activity." />;
  }
  if (game.sessionError) return <RoomGone title="Couldn't load the room" message={game.sessionError} />;
  if (!value || !phase) return <RoomLoading />;
  if (phase === "ENDED") return <RoomLoading label="Tallying the results…" />;

  const round = value.d.round;
  const stageKey = `${phase === "TIEBREAKER" ? "REVEAL" : phase}:${round?.id ?? ""}:${round?.attemptId ?? ""}`;
  const showLedger = phase !== "LOBBY";

  return (
    <GameProvider value={value}>
      {/* Full-screen app shell: no nav bar. The stage scrolls; a tiny room footer stays at the bottom. */}
      <div className="relative flex h-dvh flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span />
          <StatusPill />
          <span className="pointer-events-auto">
            <RoomMenu />
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={cn(
              "mx-auto grid min-h-full w-full max-w-6xl px-5 pt-16 short:pt-14 lg:px-8",
              showLedger && "lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14",
            )}
          >
            <main className={cn("flex min-w-0 flex-col", showLedger && "mx-auto w-full max-w-xl lg:max-w-2xl")}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={stageKey} className="flex flex-1 flex-col">
                  {PHASE_VIEW[phase]()}
                </motion.div>
              </AnimatePresence>
            </main>
            {showLedger ? <Ledger /> : null}
          </div>
        </div>

        <footer className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center text-xs text-fg-faint">
          Room <span className="tabular font-semibold tracking-[0.12em] text-fg-muted">{code}</span>
        </footer>
      </div>
    </GameProvider>
  );
}
