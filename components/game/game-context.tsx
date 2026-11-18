"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { GameDerived, GameRoom } from "@/hooks/use-game-room";
import type { ClientView } from "@/lib/game/types";

export interface GameContextValue {
  code: string;
  view: ClientView;
  d: GameDerived;
  act: GameRoom["act"];
  clockOffset: number;
  status: GameRoom["status"];
  cause: GameRoom["cause"];
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ value, children }: { value: GameContextValue; children: ReactNode }) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside a GameProvider");
  return value;
}
