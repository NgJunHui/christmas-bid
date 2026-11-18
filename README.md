# Christmas Bid

A real-time party game for gift exchanges. Everyone brings a wrapped gift and gets the same number of credits. Players take turns pitching their gift in a random order, while everyone else bids in secret for 30 seconds. The highest bidder pays the pitcher and takes the gift home. Ties are settled by a real-life tiebreaker, and the host picks the winner.

There are no accounts. You join with a 4-digit room code and a name. Designed for a group of friends in one room, each on their own phone.

**Stack:** Next.js App Router on [vinext](https://github.com/cloudflare/vinext) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Radix primitives (shadcn-style components) · Motion · Zod · Cloudflare Workers + Durable Objects (WebSocket Hibernation, SQLite storage) · Vitest · Playwright.

---

## Run it locally

```bash
npm install
npm run dev            # http://localhost:5173 (runs in local workerd, Durable Objects included)
```

To try multiplayer on one machine, open the room in a second browser profile or a private window. Each browser gets its own session.

To play from phones on the same Wi-Fi, run `npm run dev -- --host` and open the printed network URL.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (Cloudflare Build Output in `.cloudflare/output`) |
| `npm run start` | Serve the production build locally in workerd |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run typecheck` | Generate binding types, then `tsc --noEmit` |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:e2e` | Full four-player game in Chrome (Playwright) |

## Deploy

1. Authenticate: `npx cf auth login`, or set `CLOUDFLARE_API_TOKEN` (use the **Edit Cloudflare Workers** template).
2. If your account isn't picked up automatically, set `CLOUDFLARE_ACCOUNT_ID`.
3. Run `npm run deploy`.

The first deploy creates the `GameRoom` and `RoomRegistry` Durable Object namespaces from the `exports` block in [cloudflare.config.ts](cloudflare.config.ts). That block is the migration: both classes use SQLite-backed storage. The Worker is named `christmas-bid`, which must match the Worker name in the dashboard if you deploy through Workers Builds.

Durable Objects with SQLite storage are available on the Workers Free plan. No other paid services are used.

### Environment variables

The app needs **no runtime secrets**. Session credentials are generated per player and stored hashed.

| Variable | Where | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | deploy machine / CI | Authenticates `npm run deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | deploy machine / CI | Picks the account, if you have several |
| `CB_TEST_TIMERS` | **local testing only** | When `1` at build or dev time, adds a `TEST_TIMERS` binding that lets `/create?timer=8` shorten the bidding window. Never set it for a production deploy. |
| `E2E_BASE_URL` | e2e | Run Playwright against an existing server instead of starting one |
| `E2E_PORT` | e2e | Port for the server Playwright starts (default `4173`) |
| `E2E_CHANNEL` | e2e | Browser channel (default `chrome`; set empty to use Playwright's bundled Chromium after `npx playwright install chromium`) |

---

## How it works

```
Browser ──HTTP──▶ Worker (worker/index.ts)
   │                 ├─ /api/rooms/*  → worker/api.ts ──RPC──▶ RoomRegistry DO  (code → room ID, rate limits)
   │                 │                                 └─RPC──▶ GameRoom DO     (one per room)
   └──WebSocket──────┤─ /api/rooms/:code/ws ─────────────────▶ GameRoom DO
                     └─ everything else → vinext (Next.js App Router pages)
```

- **One Durable Object per room** ([worker/game-room.ts](worker/game-room.ts)) is the only source of truth. It persists the whole room as one record with a single `put`, so a credit transfer, its transaction record, and the phase change land together or not at all.
- **The game rules are pure functions** in [lib/game/engine.ts](lib/game/engine.ts). They take time, randomness, and IDs as inputs and return a new state or a typed error. [worker/room-service.ts](worker/room-service.ts) wraps them with sessions, sockets, persistence, and alarms, and runs every mutation through a queue so commands never interleave.
- **The timer is server-authoritative.** Starting bidding stores `timerStartedAt` and `timerEndsAt` and sets a Durable Object alarm for the deadline. Clients render a countdown to that fixed deadline, corrected by a measured server-clock offset (ping/pong), so refreshing never restarts it. The deadline is exclusive: a bid received at or after it is rejected. Every command and reconnect also settles an expired timer, so a late alarm can't let bids slip through.
- **Snapshots, not event replay.** After every change, each connected player gets their own sanitized `ROOM_STATE` built by [lib/game/view.ts](lib/game/view.ts). A reconnecting client just receives the current snapshot. Snapshots carry a revision number, and clients ignore older ones.
- **Registry.** [worker/room-registry.ts](worker/room-registry.ts) hands out unused 4-digit codes (leading zeros allowed) and maps them to internal UUID room IDs. Because it's a single Durable Object, two rooms created at the same moment can't get the same code. When every code is taken, it returns a clear error.

### Game phases

`LOBBY → PITCHING → BIDDING → REVEAL | TIEBREAKER | NO_BIDS`
`REVEAL | TIEBREAKER → WINNER_CONFIRMED → PITCHING (next round) | AWAITING_END → ENDED`
`NO_BIDS → BIDDING` (restart with a new attempt ID). The host can end the game from any active phase.

The table of legal transitions lives in `TRANSITIONS` in [engine.ts](lib/game/engine.ts). Every command is checked for host role, phase, round ID, attempt ID, deadline, and balance before anything changes.

### WebSocket protocol

Client → server: `GAME_START`, `BIDDING_START`, `BID_SUBMIT`, `BID_WITHDRAW`, `BIDDING_RESTART`, `WINNER_CONFIRM`, `NEXT_ROUND`, `GAME_END`, `STATE_REQUEST`, `PING`. Each carries a `requestId`, plus `roundId`/`attemptId` where relevant, and is validated with Zod ([lib/game/protocol.ts](lib/game/protocol.ts)). Joining and leaving use HTTP so the session cookie can be set.

Server → client: `ROOM_STATE` (a snapshot plus a `cause` such as `PLAYER_JOINED`, `BIDDING_STARTED`, `BID_ACCEPTED`, `BIDDING_ENDED`, `WINNER_CONFIRMED`, `ROUND_CHANGED`, `GAME_ENDED`), `ACK`/`ERROR` per request, and `PONG` for clock sync.

### Security and privacy

- **Sessions:** joining issues a random 256-bit secret, and the room stores only its SHA-256. The token is kept in an `HttpOnly; SameSite=Lax` cookie (also `Secure` on HTTPS) scoped to `/api/rooms/<code>`, so page scripts never see it. Identity and host rights always come from the session. Player IDs or roles in a payload are ignored.
- **Bid privacy:** while bidding is open, snapshots contain only the viewer's own bid and an aggregate bid count. Nobody, including the host, receives other amounts or bidder identities until the round closes. The unit and integration tests check the raw payloads for this.
- **Abuse limits:** room creation is limited to 12 per 10 minutes per IP, and code lookups to 40 per minute per IP. WebSocket messages are capped at 2 KB and rate-limited per socket. HTTP bodies are capped at 4 KB. POSTs and WebSocket upgrades must come from the same origin.
- **Names** are normalized (trimmed, control and bidi characters stripped), limited to 20 characters, unique case-insensitively, and rendered by React, so they're always escaped.

### Retention

A room expires **24 hours after its last change**. Results stay viewable until then. On expiry, the room's Durable Object deletes its storage, closes any sockets, and releases its code back to the registry. Code leases also fall back to expiring after 72 hours, in case a room never releases its code.

---

## Decisions made where the brief left room

- **Welcome screen:** a big green hero with a full-body Santa above a snow-white section holding a headline and two buttons. Join is the primary action, since everyone except the host taps it.
- **Joining is two steps, like kahoot.it:** enter the Game PIN, then a nickname. Invite links (`/join?code=1234`) skip straight to the nickname.
- **No nav bar during the game.** A floating menu button holds the player list, End game, and Leave, and a small footer shows the room code. Your credits appear where they matter: on the pitch screen, in the bid card, and in the desktop player list.
- **Bid count is shown during bidding** (for example, "3 bids in so far"). It's aggregate only and adds tension without revealing amounts or identities.
- **The pitching order stays hidden.** Each pitcher is revealed only when their round starts.
- **A bid can be withdrawn** before the deadline. This undoes an accidental bid, and the bid itself is never shown as spent.
- **Leaving:** in the lobby, a guest leaving frees their seat, and the host leaving closes the room (with a confirmation). After the game starts, "Leave for now" keeps the seat, and the same browser can rejoin from the code.
- **Multiple tabs:** the same player can have several tabs open. Every tab gets the same snapshots, and the request IDs and the state machine prevent duplicate actions.
- **Last round:** after the final confirm, the host's button reads "Wrap up". It leads to the "That's a wrap!" screen, where the host ends the game.
- **The end screen is a simple "Thank you!"** with no stats and no overall winner, because the point is swapping gifts. Round-by-round balances are visible during play.
- **API location:** the game API lives in the Worker entry rather than `app/api/` route handlers. WebSocket upgrades have to be handled there anyway, and it keeps one API surface next to the Durable Objects.
- **D1 isn't used.** Room state lives entirely in each room's Durable Object, so there's no second source of truth.

## Project layout

```
app/                    Pages: / , /create, /join, /room/[code], /room/[code]/results
components/
  brand/                SVG illustrations (lot tag, gift, Sold stamp, sparkle)
  forms/                Create and Join forms
  game/                 Room screen and one component per phase
  results/              Thank-you screen shown when the game ends
  ui/                   Button, Field, Dialog, Slider, Toaster
hooks/                  useGameRoom, useRoomConnection (reconnect + clock sync), useCountdown
lib/game/               Pure domain: types, engine (state machine), bidding, credits, view, protocol
lib/client/             HTTP API client
worker/                 Worker entry, HTTP API, GameRoom + RoomRegistry Durable Objects, room service
tests/unit/             Engine rules
tests/integration/      Room service with in-memory storage, sockets, and clock
tests/e2e/              Four-browser full game
```

Design context and the design brief are in [.impeccable.md](.impeccable.md).
