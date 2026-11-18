import { addPlayer, applyCommand, createRoom, currentRound, settle, type EngineContext } from "../lib/game/engine";
import type { GameCommand, RoomState } from "../lib/game/types";

/** Deterministic PRNG (mulberry32) so failures are reproducible. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCtx(start = 1_000_000, seed = 1) {
  let now = start;
  let n = 0;
  const random = seeded(seed);
  const ctx = (): EngineContext => ({ now, random, newId: () => `id-${++n}` });
  return {
    ctx,
    advance: (ms: number) => {
      now += ms;
    },
    get now() {
      return now;
    },
  };
}

/** A lobby with the given player names; the first is the host. */
export function lobby(names: string[], credits = 20, clock = makeCtx()): { state: RoomState; ids: string[]; clock: ReturnType<typeof makeCtx> } {
  let state = createRoom(
    { roomId: "room-1", code: "1234", startingCredits: credits, host: { id: "p0", displayName: names[0]!, tokenHash: "h0" } },
    clock.ctx(),
  );
  names.slice(1).forEach((name, i) => {
    const result = addPlayer(state, { id: `p${i + 1}`, displayName: name, tokenHash: `h${i + 1}` }, clock.ctx());
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  });
  return { state, ids: names.map((_, i) => `p${i}`), clock };
}

/** Apply a command and assert it succeeded. */
export function must(state: RoomState, actor: string, command: GameCommand, ctx: EngineContext): RoomState {
  const result = applyCommand(state, actor, command, ctx);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result.state;
}

export function round(state: RoomState) {
  const r = currentRound(state);
  if (!r) throw new Error("No current round");
  return r;
}

/** Jump past the deadline and close bidding. */
export function closeBidding(state: RoomState, clock: ReturnType<typeof makeCtx>): RoomState {
  const endsAt = round(state).timerEndsAt!;
  clock.advance(endsAt - clock.now);
  const settled = settle(state, clock.now);
  if (!settled) throw new Error("Expected bidding to close");
  return settled.state;
}
