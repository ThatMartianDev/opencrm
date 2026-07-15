import type { Notification } from "@/generated/prisma/client";

export interface ServerToClientEvents {
  notification: (notification: Notification) => void;
}

export interface ClientToServerEvents {
  // reserved for future client→server events
}

export interface InterServerEvents {
  // reserved for future server to server events
}

export interface SocketData {
  memberId: string;
}
