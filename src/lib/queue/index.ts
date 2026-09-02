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
  bossStartPromise: Promise<PgBoss> | undefined;
};

export const boss =
  globalForBoss.boss ?? new PgBoss(requireDatabaseUrl());

globalForBoss.boss = boss;

export async function ensureQueueStarted() {
  globalForBoss.bossStartPromise ??= boss.start().catch((error) => {
    globalForBoss.bossStartPromise = undefined;
    throw error;
  });

  await globalForBoss.bossStartPromise;
}

export async function stopQueue() {
  if (!globalForBoss.bossStartPromise) return;

  await globalForBoss.bossStartPromise;
  await boss.stop();
  globalForBoss.bossStartPromise = undefined;
}