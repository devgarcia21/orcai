import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * Crie um novo a cada requisição (nunca guarde em variável global).
 */
export async function createClient() {
  // cookies() vem primeiro: marca a rota como dinâmica antes de qualquer outra coisa.
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component, onde não é possível gravar
          // cookies. Pode ser ignorado: o proxy (src/proxy.ts) renova a sessão.
        }
      },
    },
  });
}
