import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { getSupabaseEnv } from "./env";

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * Crie um novo a cada requisição (nunca guarde em variável global).
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Com partialPrefetching, cookies() fica disponível no pré-render do "App
  // Shell" e não adia mais a renderização. O Supabase usa o horário atual
  // (Date.now) para validar o token, o que o Cache Components proíbe no
  // pré-render. connection() marca explicitamente: "isto é por requisição".
  await connection();
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
