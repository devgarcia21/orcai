"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { erro, erroDeValidacao, sucesso, type EstadoAcao } from "@/lib/acoes";
import { adicionarDias, hojeISO } from "@/lib/datas";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { exigirUsuario } from "@/lib/dados/prestador";
import { idValido } from "@/lib/dados/util";
import {
  orcamentoEditavel,
  proximosStatus,
  ROTULOS_STATUS,
  VALIDADE_PADRAO_DIAS,
} from "@/lib/orcamento/regras";
import { rotaEditarOrcamento, rotaOrcamento, ROTAS } from "@/lib/rotas";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { createClient } from "@/lib/supabase/server";
import type { OrcamentoCompleto } from "@/lib/types/database";
import {
  orcamentoSchema,
  statusSchema,
  type OrcamentoEntrada,
  type OrcamentoValidado,
} from "@/lib/validacoes/orcamento";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Grava orçamento + itens numa transação (função SQL salvar_orcamento). */
async function gravar(supabase: Supabase, id: string | null, dados: OrcamentoValidado) {
  const { itens, ...cabecalho } = dados;
  return supabase.rpc("salvar_orcamento", {
    p_orcamento_id: id,
    p_dados: cabecalho,
    p_itens: itens,
  });
}

export type EnvioOrcamento = { id?: string; dados: OrcamentoEntrada };

/**
 * Cria ou atualiza um orçamento. Tudo é revalidado e recalculado aqui com
 * zod: nenhum total vindo do navegador é usado.
 */
export async function salvarOrcamento(
  _anterior: EstadoAcao,
  envio: EnvioOrcamento,
): Promise<EstadoAcao> {
  await exigirUsuario();
  const id = envio.id ?? null;
  if (id && !idValido(id)) return erro("Orçamento inválido.");

  const parsed = orcamentoSchema.safeParse(envio.dados);
  if (!parsed.success) return erroDeValidacao(parsed.error);

  if (id) {
    const atual = await obterOrcamento(id);
    if (!atual) return erro("Orçamento não encontrado.");
    if (!orcamentoEditavel(atual.status)) {
      return erro(
        "Este orçamento já foi aprovado ou recusado e não pode mais ser editado. Duplique-o para criar um novo.",
      );
    }
  }

  const supabase = await createClient();
  const { data: idSalvo, error } = await gravar(supabase, id, parsed.data);
  if (error || !idSalvo) {
    return erro(
      error
        ? traduzirErroBanco(
            error,
            "Não foi possível salvar o orçamento. Tente novamente.",
          )
        : "Não foi possível salvar o orçamento.",
    );
  }

  revalidatePath(ROTAS.painel, "layout");
  redirect(rotaOrcamento(idSalvo as string));
}

/** Converte um orçamento salvo de volta para o formato de entrada (cópia). */
function paraEntrada(orcamento: OrcamentoCompleto): OrcamentoEntrada {
  return {
    cliente_id: orcamento.cliente_id,
    titulo: `${orcamento.titulo.slice(0, 140)} (cópia)`,
    itens: orcamento.itens.map((item) => ({
      descricao: item.descricao,
      quantidade: String(item.quantidade).replace(".", ","),
      unidade: item.unidade,
      valor_unitario_centavos: item.valor_unitario_centavos,
    })),
    desconto_centavos: orcamento.desconto_centavos,
    percentual_sinal: orcamento.percentual_sinal,
    // A cópia ganha uma validade nova a partir de hoje.
    valido_ate: adicionarDias(hojeISO(), VALIDADE_PADRAO_DIAS),
    condicoes_pagamento: orcamento.condicoes_pagamento ?? "",
    observacoes: orcamento.observacoes ?? "",
  };
}

/** Cria um novo rascunho com os mesmos dados e itens e abre para edição. */
export async function duplicarOrcamento(id: string): Promise<EstadoAcao> {
  const original = await obterOrcamento(id);
  if (!original) return erro("Orçamento não encontrado.");

  const parsed = orcamentoSchema.safeParse(paraEntrada(original));
  if (!parsed.success) return erro("Não foi possível duplicar este orçamento.");

  const supabase = await createClient();
  const { data: novoId, error } = await gravar(supabase, null, parsed.data);
  if (error || !novoId) {
    return erro(
      error
        ? traduzirErroBanco(error, "Não foi possível duplicar o orçamento.")
        : "Não foi possível duplicar o orçamento.",
    );
  }

  revalidatePath(ROTAS.painel, "layout");
  redirect(rotaEditarOrcamento(novoId as string));
}

export async function excluirOrcamento(id: string): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!idValido(id)) return erro("Orçamento inválido.");
  const supabase = await createClient();

  const { error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", id)
    .eq("prestador_id", usuario.id);

  if (error) {
    return erro(traduzirErroBanco(error, "Não foi possível excluir o orçamento."));
  }

  revalidatePath(ROTAS.painel, "layout");
  redirect(ROTAS.orcamentos);
}

/** Muda o status manualmente, respeitando as transições permitidas. */
export async function alterarStatusOrcamento(
  id: string,
  novoStatus: string,
): Promise<EstadoAcao> {
  const status = statusSchema.safeParse(novoStatus);
  if (!status.success) return erro("Status inválido.");

  const atual = await obterOrcamento(id);
  if (!atual) return erro("Orçamento não encontrado.");
  if (!proximosStatus(atual.status).includes(status.data)) {
    return erro(
      `Não é possível mudar de "${ROTULOS_STATUS[atual.status]}" para "${ROTULOS_STATUS[status.data]}".`,
    );
  }

  // Mantém a linha do tempo coerente quando o prestador registra à mão.
  const agora = new Date().toISOString();
  const datas =
    status.data === "enviado"
      ? { enviado_em: atual.enviado_em ?? agora }
      : { respondido_em: agora };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orcamentos")
    .update({ status: status.data, ...datas })
    .eq("id", id)
    .eq("prestador_id", atual.prestador_id);

  if (error) return erro(traduzirErroBanco(error, "Não foi possível alterar o status."));

  revalidatePath(ROTAS.painel, "layout");
  return sucesso(`Orçamento marcado como ${ROTULOS_STATUS[status.data].toLowerCase()}.`);
}

/**
 * Marca (recebido = true) ou desfaz (false) o recebimento do sinal.
 * O QR Code é estático: o prestador confere no extrato e confirma à mão.
 * O banco só aceita sinal em orçamentos aprovados (constraint da migration 004).
 */
export async function definirSinalRecebido(
  id: string,
  recebido: boolean,
): Promise<EstadoAcao> {
  const atual = await obterOrcamento(id);
  if (!atual) return erro("Orçamento não encontrado.");
  if (atual.status !== "aprovado") {
    return erro("O sinal só pode ser marcado em orçamentos aprovados.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orcamentos")
    .update({ sinal_recebido_em: recebido ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("prestador_id", atual.prestador_id);

  if (error) return erro(traduzirErroBanco(error, "Não foi possível atualizar o sinal."));

  revalidatePath(ROTAS.painel, "layout");
  return sucesso(
    recebido ? "Sinal marcado como recebido." : "Marcação do sinal desfeita.",
  );
}
