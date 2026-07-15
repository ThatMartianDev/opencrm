import type { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types";

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Persist across hot reloads in dev
const globalForIo = globalThis as unknown as { _io: IoServer | undefined };

export function setIo(io: IoServer): void {
  globalForIo._io = io;
}

export function getIo(): IoServer | null {
  return globalForIo._io ?? null;
}
