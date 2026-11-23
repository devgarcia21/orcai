import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Cliente, ClienteComContagem } from "@/lib/types/database";

import { exigirUsuario } from "./prestador";
import { idValido } from "./util";

/**
 * Todos os clientes do prestador, em ordem alfabética, com a contagem de
 * orçamentos. O RLS já restringe ao prestador logado; o filtro explícito
 * deixa a intenção clara e usa o índice.
 */
export const listarClientes = cache(async (): Promise<ClienteComContagem[]> => {
  const usuario = await exigirUsuario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*, orcamentos(count)")
    .eq("prestador_id", usuario.id)
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os clientes.");

  return (data ?? []).map(({ orcamentos, ...cliente }) => ({
    ...(cliente as Cliente),
    total_orcamentos: (orcamentos as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
});

export const obterCliente = cache(async (id: string): Promise<Cliente | null> => {
  if (!idValido(id)) return null;
  const usuario = await exigirUsuario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .eq("prestador_id", usuario.id)
    .maybeSingle<Cliente>();

  if (error) throw new Error("Não foi possível carregar o cliente.");
  return data;
});
