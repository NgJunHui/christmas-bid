/**
 * Session credentials. A token is `<roomId>.<playerId>.<secret>`; the room
 * stores only SHA-256(secret), so a leaked snapshot or log can't be replayed.
 * Uses Web Crypto, available in both Workers and Node 20+.
 */

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newSecret(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return base64url(new Uint8Array(digest));
}

/** Constant-time string comparison for equal-length hashes. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function formatToken(roomId: string, playerId: string, secret: string): string {
  return `${roomId}.${playerId}.${secret}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseToken(token: string | null | undefined): { roomId: string; playerId: string; secret: string } | null {
  if (!token || token.length > 200) return null;
  const [roomId, playerId, secret, ...rest] = token.split(".");
  if (rest.length > 0 || !roomId || !playerId || !secret) return null;
  if (!UUID.test(roomId) || !UUID.test(playerId) || !/^[A-Za-z0-9_-]{20,}$/.test(secret)) return null;
  return { roomId, playerId, secret };
}
