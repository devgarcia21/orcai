"use server";

import { erro, sucesso, type EstadoAcao } from "@/lib/acoes";
import { exigirUsuario } from "@/lib/dados/prestador";
import { obterProvedorIA } from "@/lib/ia/configuracao";
import { gerarItens } from "@/lib/ia/gerar-itens";
import type { ItemHistorico } from "@/lib/ia/historico";
import { LIMITE_GERACOES_POR_HORA } from "@/lib/ia/limite";
import type { SugestaoIA } from "@/lib/ia/resposta";
import { createClient } from "@/lib/supabase/server";
import type { ReservaUsoIa, UnidadeItem } from "@/lib/types/database";

/** Quantos orçamentos recentes viram histórico de preços (antes de filtrar). */
const ORCAMENTOS_NO_HISTORICO = 40;

export type SugestaoGerada = SugestaoIA & { itensNoHistorico: number };

type LinhaHistorico = {
  itens: {
    descricao: string;
    unidade: UnidadeItem;
    valor_unitario_centavos: number;
    ordem: number;
  }[];
};

/**
 * "Montar com IA": transforma o texto do prestador em itens sugeridos.
 * Nada é salvo no orçamento — o formulário decide o que adicionar.
 */
export async function gerarItensComIA(
  texto: string,
): Promise<EstadoAcao<SugestaoGerada>> {
  const usuario = await exigirUsuario();
  const supabase = await createClient();

  const resultado = await gerarItens(texto, {
    provedor: obterProvedorIA(),
    agora: () => new Date(),

    reservarUso: async () => {
      const { data, error } = await supabase
        .rpc("reservar_uso_ia", { p_limite: LIMITE_GERACOES_POR_HORA })
        .single<ReservaUsoIa>();
      if (error || !data) {
        throw new Error(
          `reservar_uso_ia falhou (a migration 005 foi executada?): ${error?.message}`,
        );
      }
      return data;
    },

    concluirUso: async (usoId, uso) => {
      const { error } = await supabase.rpc("concluir_uso_ia", {
        p_uso_id: usoId,
        p_tokens_entrada: uso.tokensEntrada,
        p_tokens_saida: uso.tokensSaida,
        p_sucesso: uso.sucesso,
      });
      if (error) throw error;
    },

    // Itens dos orçamentos mais recentes do próprio prestador (RLS + filtro).
    carregarHistorico: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select(
          "itens:itens_orcamento(descricao, unidade, valor_unitario_centavos, ordem)",
        )
        .eq("prestador_id", usuario.id)
        .order("created_at", { ascending: false })
        .limit(ORCAMENTOS_NO_HISTORICO)
        .overrideTypes<LinhaHistorico[], { merge: false }>();
      if (error) throw error;
      return (data ?? []).flatMap((o): ItemHistorico[] =>
        [...o.itens]
          .sort((a, b) => a.ordem - b.ordem)
          .map(({ descricao, unidade, valor_unitario_centavos }) => ({
            descricao,
            unidade,
            valor_unitario_centavos,
          })),
      );
    },
  }).catch((falha: unknown) => {
    // Falha do banco (ex.: migration 005 não executada): não quebra a tela.
    console.error("[ia] falha ao gerar itens", falha);
    return {
      ok: false as const,
      mensagem: "Não foi possível usar a IA agora. Tente de novo.",
    };
  });

  if (!resultado.ok) {
    return erro(
      resultado.mensagem,
      "campo" in resultado && resultado.campo
        ? { texto: [resultado.mensagem] }
        : undefined,
    );
  }

  const { sugestao, itensNoHistorico } = resultado;
  const n = sugestao.itens.length;
  return sucesso(
    `${n} ${n === 1 ? "item sugerido" : "itens sugeridos"}. Confira antes de adicionar.`,
    {
      ...sugestao,
      itensNoHistorico,
    },
  );
}
