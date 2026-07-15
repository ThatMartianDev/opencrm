import {PgBoss} from "pg-boss";

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL. Ensure environment variables are loaded before initializing the queue.",
    );
  }

  return databaseUrl;
}

const globalForBoss = globalThis as unknown as {
  boss: PgBoss | undefined;
  bossStarted: boolean | undefined;
};

export const boss =
  globalForBoss.boss ??
  new PgBoss(requireDatabaseUrl());

if (process.env.NODE_ENV !== "production") {
  globalForBoss.boss = boss;
}

export async function ensureQueueStarted() {
  if (globalForBoss.bossStarted) {
    return;
  }

  await boss.start();
  globalForBoss.bossStarted = true;
}

export async function stopQueue() {
  if (!globalForBoss.bossStarted) {
    return;
  }

  await boss.stop();
  globalForBoss.bossStarted = false;
}