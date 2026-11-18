/** Game-wide limits. Shared by the server (enforcement) and the client (hints). */
export const LIMITS = {
  nameMaxLength: 20,
  creditsMin: 1,
  creditsMax: 1000,
  creditsDefault: 20,
  maxPlayers: 30,
  minPlayersToStart: 2,
  /** Default and maximum bidding window. */
  biddingSeconds: 30,
  /** Shortest window accepted when test timers are enabled (local e2e only). */
  testBiddingSecondsMin: 3,
  /** Largest WebSocket frame the server will parse. */
  maxMessageBytes: 2048,
  /** How many recent request IDs are remembered for idempotency. */
  processedRequestsCap: 200,
} as const;

/** A room expires this long after its last state change. Results stay readable until then. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/** Fallback lease on a room code in the registry, in case a room never releases it. */
export const CODE_LEASE_MS = 72 * 60 * 60 * 1000;

/** WebSocket close codes the client understands. */
export const CLOSE_CODES = {
  unauthorized: 4401,
  notFound: 4404,
  expired: 4410,
  leftRoom: 4000,
} as const;
