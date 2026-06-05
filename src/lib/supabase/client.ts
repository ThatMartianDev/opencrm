import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "user-uploads";
export const AVATARS_BUCKET = "avatars";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  _client = createClient(url, key);
  return _client;
}
