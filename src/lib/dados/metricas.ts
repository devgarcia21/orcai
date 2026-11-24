import "server-only";

import { cache } from "react";

import { inicioDoDiaNoBrasil } from "@/lib/datas";
import type { OrcamentoParaMetricas } from "@/lib/metricas/calcular";
import { numeroDoBanco } from "@/lib/moeda";
import { createClient } from "@/lib/supabase/server";

import { exigirUsuario } from "./prestador";

/** Teto de segurança: o painel não deveria precisar de tantos orçamentos. */
const LIMITE = 2000;

const COLUNAS =
  "id, numero, titulo, status, created_at, enviado_em, visualizado_em, respondido_em, sinal_recebido_em, valido_ate, desconto_centavos, percentual_sinal, token_publico, cliente:clientes(nome, telefone), itens:itens_orcamento(quantidade, valor_unitario_centavos)";

type Linha = Omit<
  OrcamentoParaMetricas,
  "itens" | "cliente_nome" | "cliente_telefone"
> & {
  cliente: { nome: string; telefone: string | null } | null;
  itens: { quantidade: number | string; valor_unitario_centavos: number }[];
};

/**
 * Orçamentos de que o painel precisa, e só eles:
 * - qualquer evento (criado, enviado, respondido, sinal recebido) desde `desde`
 *   (início do período anterior ou do gráfico de 6 meses, o que vier antes);
 * - os pendentes de agora (enviados sem resposta e aprovados sem sinal), de
 *   qualquer data — eles entram em "A receber", "Aguardando" e "Atenção".
 * O RLS garante que só vêm orçamentos do prestador logado.
 */
export const listarOrcamentosParaMetricas = cache(
  async (desde: string): Promise<OrcamentoParaMetricas[]> => {
    const usuario = await exigirUsuario();
    const supabase = await createClient();
    // Meia-noite em São Paulo, menos 1 dia de folga (a classificação fina é no módulo).
    const instante = inicioDoDiaNoBrasil(desde);
    const desdeComFolga = new Date(Date.parse(instante) - 86_400_000).toISOString();
    const q = (coluna: string) => `${coluna}.gte."${desdeComFolga}"`;

    const { data, error } = await supabase
      .from("orcamentos")
      .select(COLUNAS)
      .eq("prestador_id", usuario.id)
      .or(
        [
          q("created_at"),
          q("enviado_em"),
          q("respondido_em"),
          q("sinal_recebido_em"),
          "status.eq.enviado",
          "and(status.eq.aprovado,sinal_recebido_em.is.null)",
        ].join(","),
      )
      .order("created_at", { ascending: false })
      .limit(LIMITE)
      .overrideTypes<Linha[], { merge: false }>();

    if (error) throw new Error("Não foi possível carregar as métricas.");

    return (data ?? []).map(({ cliente, itens, ...o }) => ({
      ...o,
      cliente_nome: cliente?.nome ?? "Cliente removido",
      cliente_telefone: cliente?.telefone ?? null,
      itens: itens.map((i) => ({
        quantidade: numeroDoBanco(i.quantidade),
        valor_unitario_centavos: i.valor_unitario_centavos,
      })),
    }));
  },
);

/** O prestador já enviou algum orçamento? (Conta nova → estado vazio do painel.) */
export const possuiOrcamentoEnviado = cache(async (): Promise<boolean> => {
  const usuario = await exigirUsuario();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("orcamentos")
    .select("id", { count: "exact", head: true })
    .eq("prestador_id", usuario.id)
    .neq("status", "rascunho");
  if (error) throw new Error("Não foi possível carregar as métricas.");
  return (count ?? 0) > 0;
});
