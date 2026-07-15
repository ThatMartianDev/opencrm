import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./src/lib/realtime/types";
import { setIo } from "./src/lib/realtime/index";
import { verifySessionToken } from "./src/lib/auth/token";
import { registerNotificationWorker } from "./src/modules/notifications/worker";

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return undefined;
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      handle(req, res);
    });

    const io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      path: "/api/socket",
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? `http://${hostname}:${port}`,
        credentials: true,
      },
    });

    setIo(io);

    // Authenticate the handshake from the session cookie — never trust a
    // client-supplied id, otherwise anyone could join another member's room.
    io.use(async (socket, next) => {
      const token = getCookieValue(socket.handshake.headers.cookie, "session");
      const claims = await verifySessionToken(token);

      if (!claims) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.memberId = claims.memberId;
      next();
    });

    io.on("connection", (socket) => {
      socket.join(`user:${socket.data.memberId}`);
    });

    // Consume notification delivery jobs in this process so the InAppAdapter
    // can push over socket.io. A standalone worker is no longer required in dev.
    registerNotificationWorker().catch((error: unknown) => {
      console.error("[server] failed to start notification worker", error);
    });

    httpServer.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
