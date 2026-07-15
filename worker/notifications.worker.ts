import "dotenv/config";

import { prisma } from "../src/lib/db/client";
import { boss, stopQueue } from "../src/lib/queue";
import { registerNotificationWorker } from "../src/modules/notifications/worker";

// Optional standalone delivery worker. The web server (server.ts) already
// consumes delivery jobs with socket.io push; run this process to scale out
// delivery (DB persistence + email). Its InAppAdapter has no io instance,
// so the real-time push is silently skipped here.
async function startWorker() {
  boss.on("error", (error) => {
    console.error("[worker] pg-boss error", error);
  });

  await registerNotificationWorker();

  console.log("[worker] notifications worker started");
}

async function shutdown(signal: string) {
  console.log(`[worker] shutting down on ${signal}`);
  await stopQueue();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startWorker().catch(async (error) => {
  console.error("[worker] failed to start notifications worker", error);
  await prisma.$disconnect();
  process.exit(1);
});
