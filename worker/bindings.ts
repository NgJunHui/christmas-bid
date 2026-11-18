import type { GameRoom } from "./game-room";
import type { RoomRegistry } from "./room-registry";

/** Typed stubs. The generated Env types bind by name, so the RPC surface is attached here. */
export function gameRoomStub(env: Env, roomId: string): DurableObjectStub<GameRoom> {
  const namespace = env.GAME_ROOM as unknown as DurableObjectNamespace<GameRoom>;
  return namespace.get(namespace.idFromName(roomId));
}

export function registryStub(env: Env): DurableObjectStub<RoomRegistry> {
  const namespace = env.ROOM_REGISTRY as unknown as DurableObjectNamespace<RoomRegistry>;
  return namespace.get(namespace.idFromName("global"));
}
