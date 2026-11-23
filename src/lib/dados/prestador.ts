import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ROTAS } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/server";
import type { Prestador } from "@/lib/types/database";

/**
 * Retorna o id e e-mail do usuário logado (validando o token) ou manda para
 * o login. `cache` evita repetir a consulta no mesmo render (layout + página).
 */
export const exigirUsuario = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(ROTAS.login);
  return { id: claims.sub, email: (claims.email as string | undefined) ?? "" };
});

/** Perfil do prestador logado. */
export const obterPrestadorAtual = cache(async (): Promise<Prestador> => {
  const usuario = await exigirUsuario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prestadores")
    .select("*")
    .eq("id", usuario.id)
    .single<Prestador>();

  if (error || !data) {
    throw new Error(
      "Perfil do prestador não encontrado. Confirme se o SQL de supabase/migrations foi executado.",
    );
  }
  return data;
});

/** Perfil pronto para gerar orçamentos: precisa de telefone e chave PIX. */
export function perfilCompleto(prestador: Prestador): boolean {
  return Boolean(prestador.telefone && prestador.chave_pix);
}

/** Nome exibido no cabeçalho: empresa, se houver; senão o nome do prestador. */
export function nomeDeExibicao(prestador: Prestador): string {
  return prestador.nome_empresa || prestador.nome || "Meu negócio";
}
