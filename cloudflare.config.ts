import { bindings, defineConfig, defineWorker, exports as workerExports } from "cf/config";

const WORKER_NAME = "christmas-bid";

export default defineConfig({
  worker: defineWorker({
    name: WORKER_NAME,
    // Custom entry: exports the Durable Objects and routes /api/rooms/* before handing off to vinext.
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-11-18",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      GAME_ROOM: bindings.durableObject({ worker: WORKER_NAME, exportName: "GameRoom" }),
      ROOM_REGISTRY: bindings.durableObject({ worker: WORKER_NAME, exportName: "RoomRegistry" }),
      // Local e2e only: lets tests shorten the 30-second bidding window. Never set in production.
      TEST_TIMERS: process.env.CB_TEST_TIMERS === "1" && bindings.text("1"),
    },
    exports: {
      GameRoom: workerExports.durableObject({ storage: "sqlite" }),
      RoomRegistry: workerExports.durableObject({ storage: "sqlite" }),
    },
  }),
});
