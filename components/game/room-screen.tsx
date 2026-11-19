"use client";

import { WifiOff } from "lucide-react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/art";
import { useGameRoom } from "@/hooks/use-game-room";
import type { Phase } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { BidReveal } from "./bid-reveal";
import { BiddingStage } from "./bidding-stage";
import { GameProvider, useGame, type GameContextValue } from "./game-context";
import { NoBidsState } from "./no-bids-state";
import { PitchAnnouncement } from "./pitch-announcement";
import { LeaveGameButton } from "./room-menu";
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
  // Legacy: confirming a winner now goes straight to the next pitch (or the end), so new games
  // never land here. Kept so a room saved mid-round before that change still renders.
  WINNER_CONFIRMED: () => <WinnerAnnouncement />,
  // Reached only if the last pitcher leaves for good; otherwise the final confirm ends the game.
  AWAITING_END: () => <WrapUp />,
};

/**
 * While a stage animates out, keep feeding it the game state it was showing, not the next
 * phase's. Otherwise a stage re-renders mid-exit with data it can't handle: e.g. "Next bid"
 * opens the next round straight away, and the bid results would re-render with that new
 * round (no reveal yet) and crash.
 */
function StageSnapshot({ children }: { children: ReactNode }) {
  const live = useGame();
  const isPresent = useIsPresent();
  const [shown, setShown] = useState(live);
  // Track the live state while on screen (React's "store info from previous renders" pattern).
  if (isPresent && shown !== live) setShown(live);
  return <GameProvider value={isPresent ? live : shown}>{children}</GameProvider>;
}

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

  return (
    <GameProvider value={value}>
      {/*
        Full-screen app shell. A slim top nav (Bidmas centred, the leave button pinned to the far
        right of the window), then one centred, phone-width column at every screen size, so
        desktop looks exactly like mobile.
      */}
      <div className="relative flex h-dvh flex-col">
        <header className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <Logo />
            <span className="justify-self-end">
              <LeaveGameButton />
            </span>
          </div>
        </header>
        {/* "Reconnecting…" and similar float just under the nav, only when needed. */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(1rem,env(safe-area-inset-top))+3.25rem)] z-30 flex justify-center px-4">
          <StatusPill />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-4 short:pt-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stageKey} className="flex flex-1 flex-col">
                <StageSnapshot>{PHASE_VIEW[phase]()}</StageSnapshot>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* "Room 1234" only in the lobby; once the game starts it's just a safe-area spacer. */}
        {phase === "LOBBY" ? (
          <footer className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center text-xs text-fg-faint">
            Room <span className="tabular font-semibold tracking-[0.12em] text-fg-muted">{code}</span>
          </footer>
        ) : (
          <div aria-hidden className="shrink-0 pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </GameProvider>
  );
}
