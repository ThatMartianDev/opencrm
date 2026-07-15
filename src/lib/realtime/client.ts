"use client";

import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./types";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

/**
 * Returns (and lazily creates) the singleton socket for the current user.
 * Call this from a client component after the user is authenticated.
 * The server authenticates the connection from the session cookie.
 */
export function getSocket(): ClientSocket {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      withCredentials: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
