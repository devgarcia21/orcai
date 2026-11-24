/**
 * Contrato de um provedor de IA. O resto do app só conhece esta interface:
 * trocar de provedor (ex.: Gemini → Claude) é criar outra implementação e
 * devolvê-la em `obterProvedorIA` (lib/ia/configuracao.ts).
 */

export type PedidoJson = {
  /** Instruções de sistema (regras fixas, nunca vêm do usuário). */
  instrucoes: string;
  /** Conteúdo do pedido (dados do usuário, já embalados como dado). */
  entrada: string;
  /** JSON Schema da resposta: o provedor deve devolver JSON nesse formato. */
  schema: Record<string, unknown>;
  /** Tempo máximo da chamada; ao passar, falha com ErroIA "tempo". */
  timeoutMs: number;
};

export type RespostaJson = {
  /** O JSON devolvido pelo modelo, ainda NÃO validado (passe pelo zod). */
  json: unknown;
  tokensEntrada: number;
  tokensSaida: number;
};

export interface ProvedorIA {
  /** Nome para logs ("gemini"). */
  readonly nome: string;
  gerarJson(pedido: PedidoJson): Promise<RespostaJson>;
}

/**
 * Falhas esperadas de uma chamada à IA, já classificadas. Cada provedor
 * converte os próprios erros nestes tipos; a interface só mostra a mensagem.
 */
export type TipoErroIA =
  | "limite_provedor" // 429 do provedor (cota do plano gratuito)
  | "tempo" // passou do timeout
  | "conexao" // sem rede / DNS / conexão recusada
  | "ocupado" // 5xx do provedor
  | "resposta_invalida" // veio vazio ou não é JSON
  | "indisponivel"; // chave inválida, modelo inexistente, bloqueio etc.

export class ErroIA extends Error {
  constructor(
    readonly tipo: TipoErroIA,
    detalhe?: string,
    options?: { cause?: unknown },
  ) {
    super(detalhe ?? tipo, options);
    this.name = "ErroIA";
  }
}

export const MENSAGENS_ERRO_IA: Record<TipoErroIA, string> = {
  limite_provedor: "Muitas solicitações agora, tente novamente em instantes.",
  tempo: "A IA demorou demais para responder. Tente novamente.",
  conexao:
    "Sem conexão com o serviço de IA. Confira a internet do servidor e tente de novo.",
  ocupado: "O serviço de IA está instável agora. Tente novamente em instantes.",
  resposta_invalida:
    "A IA devolveu uma resposta inválida. Tente de novo ou descreva o serviço com outras palavras.",
  indisponivel: "IA indisponível no momento.",
};
