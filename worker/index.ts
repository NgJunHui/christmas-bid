/**
 * Worker entry. Game API and WebSockets are handled here; every other request
 * goes to the vinext (Next.js App Router) handler. The Durable Object classes
 * must be exported from the main module so Cloudflare can instantiate them.
 */
import vinext from "vinext/server/fetch-handler";
import { handleApi } from "./api";

export { GameRoom } from "./game-room";
export { RoomRegistry } from "./room-registry";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/rooms" || url.pathname.startsWith("/api/rooms/")) {
      return handleApi(request, env, url);
    }
    return vinext.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
