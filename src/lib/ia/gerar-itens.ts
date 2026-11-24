import type { ReservaUsoIa } from "@/lib/types/database";

import { selecionarHistorico, type ItemHistorico } from "./historico";
import { mensagemLimiteAtingido, textoPedidoIaSchema, TIMEOUT_IA_MS } from "./limite";
import { INSTRUCOES_SISTEMA, montarEntrada, SCHEMA_RESPOSTA_IA } from "./prompt";
import { ErroIA, MENSAGENS_ERRO_IA, type ProvedorIA } from "./provedor";
import { normalizarResposta, type SugestaoIA } from "./resposta";

/**
 * Tudo o que a geração precisa do "mundo de fora". A Server Action passa as
 * implementações reais (Supabase + Gemini); os testes passam mocks — assim
 * nenhum teste chama a API de verdade.
 */
export type DependenciasGeracao = {
  /** `null` quando não há chave configurada. */
  provedor: ProvedorIA | null;
  /** Confere o limite por hora e registra o uso (reservar_uso_ia). */
  reservarUso: () => Promise<ReservaUsoIa>;
  /** Grava tokens e resultado do uso reservado (concluir_uso_ia). */
  concluirUso: (
    usoId: string,
    uso: { tokensEntrada: number; tokensSaida: number; sucesso: boolean },
  ) => Promise<void>;
  /** Itens de orçamentos anteriores, do mais recente para o mais antigo. */
  carregarHistorico: () => Promise<ItemHistorico[]>;
  agora: () => Date;
  /** Para registrar falhas inesperadas (padrão: console.error). */
  registrarErro?: (mensagem: string, erro: unknown) => void;
};

export type ResultadoGeracao =
  | { ok: true; sugestao: SugestaoIA; itensNoHistorico: number }
  | { ok: false; mensagem: string; campo?: "texto" };

export const MENSAGEM_SEM_ITENS =
  "Não encontrei serviços ou materiais nesse texto. Descreva o que vai ser feito, ex.: trocar 3 tomadas e instalar um chuveiro.";

/** Orquestra a geração: valida, confere o limite, chama a IA e normaliza. */
export async function gerarItens(
  texto: unknown,
  deps: DependenciasGeracao,
): Promise<ResultadoGeracao> {
  const registrarErro = deps.registrarErro ?? console.error;

  const lido = textoPedidoIaSchema.safeParse(texto);
  if (!lido.success) {
    return { ok: false, mensagem: lido.error.issues[0].message, campo: "texto" };
  }

  if (!deps.provedor) return { ok: false, mensagem: MENSAGENS_ERRO_IA.indisponivel };

  const reserva = await deps.reservarUso();
  if (!reserva.permitido || !reserva.uso_id) {
    return {
      ok: false,
      mensagem: mensagemLimiteAtingido(reserva.liberado_em, deps.agora()),
    };
  }
  const usoId = reserva.uso_id;

  let tokensEntrada = 0;
  let tokensSaida = 0;
  const concluir = async (sucesso: boolean) => {
    try {
      await deps.concluirUso(usoId, { tokensEntrada, tokensSaida, sucesso });
    } catch (erro) {
      // Falhar ao anotar o consumo não pode estragar a resposta ao prestador.
      registrarErro("[ia] não foi possível concluir o uso", erro);
    }
  };

  try {
    const historico = selecionarHistorico(await deps.carregarHistorico(), lido.data);
    const resposta = await deps.provedor.gerarJson({
      instrucoes: INSTRUCOES_SISTEMA,
      entrada: montarEntrada(lido.data, historico),
      schema: SCHEMA_RESPOSTA_IA,
      timeoutMs: TIMEOUT_IA_MS,
    });
    tokensEntrada = resposta.tokensEntrada;
    tokensSaida = resposta.tokensSaida;

    const sugestao = normalizarResposta(resposta.json, historico, lido.data);
    await concluir(true);

    if (sugestao.itens.length === 0) {
      return { ok: false, mensagem: MENSAGEM_SEM_ITENS, campo: "texto" };
    }
    return { ok: true, sugestao, itensNoHistorico: historico.length };
  } catch (erro) {
    await concluir(false);
    if (erro instanceof ErroIA) {
      if (erro.tipo === "indisponivel" || erro.tipo === "resposta_invalida") {
        registrarErro(`[ia] ${deps.provedor.nome}: ${erro.tipo} — ${erro.message}`, erro);
      }
      return { ok: false, mensagem: MENSAGENS_ERRO_IA[erro.tipo] };
    }
    registrarErro("[ia] erro inesperado", erro);
    return { ok: false, mensagem: MENSAGENS_ERRO_IA.indisponivel };
  }
}
