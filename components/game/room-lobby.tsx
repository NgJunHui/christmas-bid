"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/lib/game/constants";
import type { PlayerView } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { useGame } from "./game-context";
import { RoomCodeDisplay } from "./room-code-display";
import { Stage, StageActions, StageBody, WaitingNote } from "./stage";

/**
 * Who's here, and nothing more: names that pop in as they join.
 * The host is labelled; your own name is set in gold; offline players fade.
 */
function PlayerChips({ players, meId, waitingFor }: { players: PlayerView[]; meId: string; waitingFor: string }) {
  const count = players.length;
  return (
    <section className="flex w-full flex-col items-center gap-4" aria-labelledby="players-heading">
      {/* Same one-line waiting message as every other screen. */}
      <WaitingNote>{waitingFor}</WaitingNote>
      <h2 id="players-heading" className="text-eyebrow font-semibold uppercase text-gold/80">
        <span className="tabular">{count}</span> {count === 1 ? "Player" : "Players"}
      </h2>
      {/* Equal 280px pills (fits a 20-character name plus the Host tag): one per row on phones, up to three on desktop. */}
      <ul className="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,17.5rem)] justify-center gap-2" aria-label="Players">
        <AnimatePresence initial={false}>
          {players.map((player) => (
            <motion.li
              key={player.id}
              layout
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: player.isConnected ? 1 : 0.5, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.16 } }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex h-11 w-[17.5rem] items-center justify-between gap-2 rounded-full border border-line px-5 font-medium",
                player.id === meId ? "text-gold" : "text-fg",
              )}
            >
              <span className="min-w-0 truncate">{player.displayName}</span>
              {player.isHost ? (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-gold">
                  Host
                </span>
              ) : null}
              {player.isConnected ? null : <span className="sr-only">(offline)</span>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

export function RoomLobby() {
  const { view, d, act } = useGame();
  const [starting, setStarting] = useState(false);
  const count = view.players.length;
  const canStart = count >= LIMITS.minPlayersToStart;

  return (
    <Stage>
      <StageBody className="items-center justify-start gap-8 text-center sm:gap-10">
        <h1 className="sr-only" aria-live="polite">
          Room {view.room.code} lobby: {count} {count === 1 ? "player" : "players"}
        </h1>
        <RoomCodeDisplay code={view.room.code} />
        <PlayerChips
          players={view.players}
          meId={view.me.id}
          waitingFor={d.isHost ? "Waiting for players" : "Waiting for the host to start the game."}
        />
      </StageBody>

      {/* Only the host has an action here; players just watch the list fill up. */}
      {d.isHost ? (
        <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Button
            size="lg"
            disabled={!canStart}
            loading={starting}
            onClick={async () => {
              setStarting(true);
              await act({ type: "GAME_START" });
              setStarting(false);
            }}
          >
            Start game
          </Button>
        </StageActions>
      ) : null}
    </Stage>
  );
}
