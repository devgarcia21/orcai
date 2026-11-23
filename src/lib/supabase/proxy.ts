import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ROTAS } from "@/lib/rotas";

import { getSupabaseEnv } from "./env";

/** Rotas de autenticação: quem já está logado é mandado para o painel. */
const ROTAS_DE_AUTH: string[] = [ROTAS.login, ROTAS.cadastro];

function redirecionar(supabaseResponse: NextResponse, url: URL) {
  const resposta = NextResponse.redirect(url);
  // Preserva os cookies de sessão que o Supabase possa ter renovado.
  supabaseResponse.cookies.getAll().forEach((cookie) => resposta.cookies.set(cookie));
  return resposta;
}

/**
 * Renova a sessão do Supabase a cada requisição e aplica as regras de acesso:
 * - não logado em /painel/* → /login?next=<rota>
 * - logado em /login ou /cadastro → /painel
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims(): é aqui que o
  // token é validado e, se necessário, renovado.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!logado && pathname.startsWith(ROTAS.painel)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTAS.login;
    destino.search = "";
    destino.searchParams.set("next", pathname + search);
    return redirecionar(supabaseResponse, destino);
  }

  if (logado && ROTAS_DE_AUTH.includes(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTAS.painel;
    destino.search = "";
    return redirecionar(supabaseResponse, destino);
  }

  return supabaseResponse;
}
