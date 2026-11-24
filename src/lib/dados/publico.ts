import "server-only";

import { cache } from "react";

import { numeroDoBanco } from "@/lib/moeda";
import { tokenPublicoValido } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/server";
import type { OrcamentoPublico } from "@/lib/types/database";

/**
 * Orçamento visto pelo cliente, via função SECURITY DEFINER (as tabelas
 * continuam fechadas para anon). Token inválido ou rascunho → null.
 *
 * Sempre lê SEM registrar a visualização: o servidor também atende o robô de
 * prévia do WhatsApp. A visualização é registrada pelo navegador do cliente
 * (ver registrarVisualizacao em actions/publico.ts).
 */
export const obterOrcamentoPublico = cache(
  async (token: string): Promise<OrcamentoPublico | null> => {
    if (!tokenPublicoValido(token)) return null;
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("obter_orcamento_publico", {
      p_token: token,
      p_registrar_visualizacao: false,
    });
    if (error) throw new Error("Não foi possível carregar o orçamento.");
    if (!data) return null;

    const orcamento = data as OrcamentoPublico;
    return {
      ...orcamento,
      itens: orcamento.itens.map((item) => ({
        ...item,
        quantidade: numeroDoBanco(item.quantidade),
      })),
    };
  },
);
