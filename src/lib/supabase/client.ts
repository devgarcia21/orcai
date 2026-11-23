import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/** Cliente do Supabase para Client Components (roda no navegador). */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
