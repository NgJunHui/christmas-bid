"use client";

import { useState } from "react";
import { SantaHat, Sparkle } from "@/components/brand/art";
import { Button } from "@/components/ui/button";
import { useGame } from "./game-context";
import { Eyebrow, Stage, StageActions, StageBody, WaitingNote } from "./stage";

export function WrapUp() {
  const { d, act } = useGame();
  const [busy, setBusy] = useState(false);
  return (
    <Stage>
      <StageBody className="items-center text-center">
        <div className="relative" aria-hidden>
          <Sparkle className="absolute -left-8 top-6 size-5" />
          <Sparkle className="absolute -right-7 top-0 size-7" />
          <SantaHat className="w-28 -rotate-12" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Eyebrow>Every gift has had its turn</Eyebrow>
          <h1 className="font-display text-[3.25rem] leading-none text-gold sm:text-[4.25rem]">That's a wrap!</h1>
          <p className="text-lg text-fg-muted">Everyone has pitched their Christmas gift.</p>
        </div>
      </StageBody>
      <StageActions className="sm:mx-auto sm:w-full sm:max-w-sm">
        {d.isHost ? (
          <>
            <Button
              size="lg"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await act({ type: "GAME_END" });
                setBusy(false);
              }}
            >
              End game
            </Button>
            <p className="text-center text-sm text-fg-muted">Everyone will see the final results.</p>
          </>
        ) : (
          <WaitingNote>Waiting for the host to end the game.</WaitingNote>
        )}
      </StageActions>
    </Stage>
  );
}
