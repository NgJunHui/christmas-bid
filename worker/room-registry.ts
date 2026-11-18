/**
 * A single Durable Object that maps public 4-digit codes to internal room IDs.
 * Because a Durable Object processes one storage-gated request at a time, two
 * rooms created at the same moment can never be handed the same code.
 * It also rate-limits room creation and code lookups per client IP.
 */
import { DurableObject } from "cloudflare:workers";
import { CODE_LEASE_MS } from "../lib/game/constants";
import type { GameError } from "../lib/game/types";

interface Lease {
  roomId: string;
  expiresAt: number;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: GameError };

const CODE_SPACE = 10_000;
const RATE_LIMITS = {
  create: { max: 12, windowMs: 10 * 60_000 },
  lookup: { max: 40, windowMs: 60_000 },
} as const;

const key = (code: string) => `code:${code}`;
const pad = (n: number) => n.toString().padStart(4, "0");

function randomIndex(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]! % CODE_SPACE;
}

export class RoomRegistry extends DurableObject<Env> {
  /** In-memory sliding windows; resetting on eviction is acceptable for abuse limits. */
  private readonly hits = new Map<string, number[]>();

  private limited(bucket: keyof typeof RATE_LIMITS, ip: string): boolean {
    const { max, windowMs } = RATE_LIMITS[bucket];
    const now = Date.now();
    const id = `${bucket}:${ip}`;
    const recent = (this.hits.get(id) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    this.hits.set(id, recent);
    if (this.hits.size > 5_000) this.hits.clear();
    return recent.length > max;
  }

  private async isFree(code: string, now: number): Promise<boolean> {
    const lease = await this.ctx.storage.get<Lease>(key(code));
    return !lease || lease.expiresAt <= now;
  }

  async allocate(roomId: string, ip: string): Promise<Result<{ code: string }>> {
    if (this.limited("create", ip)) {
      return { ok: false, error: { code: "RATE_LIMITED", message: "That's a lot of rooms! Try again in a few minutes." } };
    }
    const now = Date.now();
    const lease: Lease = { roomId, expiresAt: now + CODE_LEASE_MS };

    for (let attempt = 0; attempt < 40; attempt++) {
      const code = pad(randomIndex());
      if (await this.isFree(code, now)) {
        await this.ctx.storage.put(key(code), lease);
        return { ok: true, code };
      }
    }
    // Space is nearly full: scan everything once from a random offset.
    const taken = await this.ctx.storage.list<Lease>({ prefix: "code:" });
    const start = randomIndex();
    for (let i = 0; i < CODE_SPACE; i++) {
      const code = pad((start + i) % CODE_SPACE);
      const existing = taken.get(key(code));
      if (!existing || existing.expiresAt <= now) {
        await this.ctx.storage.put(key(code), lease);
        return { ok: true, code };
      }
    }
    return { ok: false, error: { code: "ROOMS_FULL", message: "Every room code is in use right now. Try again soon." } };
  }

  async lookup(code: string, ip: string): Promise<Result<{ roomId: string }>> {
    if (this.limited("lookup", ip)) {
      return { ok: false, error: { code: "RATE_LIMITED", message: "Too many tries. Wait a minute and try again." } };
    }
    const lease = await this.ctx.storage.get<Lease>(key(code));
    if (!lease || lease.expiresAt <= Date.now()) {
      return { ok: false, error: { code: "NOT_FOUND", message: "We couldn't find a room with that code." } };
    }
    return { ok: true, roomId: lease.roomId };
  }

  async release(code: string, roomId: string): Promise<void> {
    const lease = await this.ctx.storage.get<Lease>(key(code));
    if (lease?.roomId === roomId) await this.ctx.storage.delete(key(code));
  }
}
