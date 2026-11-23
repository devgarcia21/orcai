import "server-only";

import { cache } from "react";

import { numeroDoBanco } from "@/lib/moeda";
import { calcularResumo } from "@/lib/orcamento/calculos";
import { createClient } from "@/lib/supabase/server";
import type {
  Cliente,
  ItemOrcamento,
  Orcamento,
  OrcamentoCompleto,
  OrcamentoResumo,
} from "@/lib/types/database";

import { exigirUsuario } from "./prestador";
import { idValido } from "./util";

/** Limite das listagens nesta etapa; paginação entra com o painel de métricas. */
const LIMITE_LISTAGEM = 500;

type LinhaListagem = Pick<
  Orcamento,
  | "id"
  | "numero"
  | "titulo"
  | "status"
  | "created_at"
  | "cliente_id"
  | "desconto_centavos"
  | "percentual_sinal"
> & {
  cliente: { nome: string } | null;
  itens: { quantidade: number | string; valor_unitario_centavos: number }[];
};

/**
 * O total não é guardado no banco: é sempre derivado dos itens pelo módulo
 * de cálculos, para nunca existir um "total" divergente dos itens.
 */
function paraResumo(linha: LinhaListagem): OrcamentoResumo {
  const itens = linha.itens.map((i) => ({
    quantidade: numeroDoBanco(i.quantidade),
    valor_unitario_centavos: i.valor_unitario_centavos,
  }));
  const { total } = calcularResumo(
    itens,
    linha.desconto_centavos,
    linha.percentual_sinal,
  );
  return {
    id: linha.id,
    numero: linha.numero,
    titulo: linha.titulo,
    status: linha.status,
    created_at: linha.created_at,
    cliente_id: linha.cliente_id,
    cliente_nome: linha.cliente?.nome ?? "Cliente removido",
    total_centavos: total,
  };
}

const COLUNAS_LISTAGEM =
  "id, numero, titulo, status, created_at, cliente_id, desconto_centavos, percentual_sinal, cliente:clientes(nome), itens:itens_orcamento(quantidade, valor_unitario_centavos)";

/**
 * Orçamentos do prestador, do mais recente para o mais antigo.
 * Argumentos primitivos para o `cache` do React conseguir reaproveitar.
 */
export const listarOrcamentos = cache(
  async (
    clienteId?: string,
    limite: number = LIMITE_LISTAGEM,
  ): Promise<OrcamentoResumo[]> => {
    if (clienteId !== undefined && !idValido(clienteId)) return [];
    const usuario = await exigirUsuario();
    const supabase = await createClient();

    let consulta = supabase
      .from("orcamentos")
      .select(COLUNAS_LISTAGEM)
      .eq("prestador_id", usuario.id)
      .order("numero", { ascending: false })
      .limit(limite);

    if (clienteId) consulta = consulta.eq("cliente_id", clienteId);

    const { data, error } = await consulta.overrideTypes<
      LinhaListagem[],
      { merge: false }
    >();
    if (error) throw new Error("Não foi possível carregar os orçamentos.");
    return (data ?? []).map(paraResumo);
  },
);

/** Orçamento com cliente e itens (em ordem). */
export const obterOrcamento = cache(
  async (id: string): Promise<OrcamentoCompleto | null> => {
    if (!idValido(id)) return null;
    const usuario = await exigirUsuario();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("orcamentos")
      .select("*, cliente:clientes(*), itens:itens_orcamento(*)")
      .eq("id", id)
      .eq("prestador_id", usuario.id)
      .maybeSingle<Orcamento & { cliente: Cliente; itens: ItemOrcamento[] }>();

    if (error) throw new Error("Não foi possível carregar o orçamento.");
    if (!data) return null;

    return {
      ...data,
      itens: data.itens
        .map((item) => ({ ...item, quantidade: numeroDoBanco(item.quantidade) }))
        .sort((a, b) => a.ordem - b.ordem),
    };
  },
);
