import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { ErroIA, type PedidoJson, type ProvedorIA, type RespostaJson } from "./provedor";

/**
 * Implementação do ProvedorIA com o Google Gemini (SDK oficial @google/genai).
 * Só roda no servidor: a chave nunca chega ao navegador.
 *
 * Saída estruturada: `responseMimeType: "application/json"` +
 * `responseJsonSchema` — o modelo devolve JSON no formato do schema, nunca
 * texto livre. Mesmo assim o resultado é validado com zod por quem chama.
 */
export class ProvedorGemini implements ProvedorIA {
  readonly nome = "gemini";
  private readonly cliente: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly modelo: string,
  ) {
    this.cliente = new GoogleGenAI({
      apiKey,
      httpOptions: {
        // O Gemini às vezes responde 503 ("high demand") por alguns segundos:
        // tenta de novo até 3 vezes, sempre dentro do timeout total da chamada.
        // 429 (cota do plano gratuito) NÃO é repetido: o prestador é avisado.
        retryOptions: {
          attempts: 3,
          initialDelay: 1,
          maxDelay: 4,
          httpStatusCodes: [500, 502, 503, 504],
        },
      },
    });
  }

  async gerarJson(pedido: PedidoJson): Promise<RespostaJson> {
    const sinal = AbortSignal.timeout(pedido.timeoutMs);

    let resposta;
    try {
      resposta = await this.cliente.models.generateContent({
        model: this.modelo,
        contents: pedido.entrada,
        config: {
          systemInstruction: pedido.instrucoes,
          responseMimeType: "application/json",
          responseJsonSchema: pedido.schema,
          abortSignal: sinal,
        },
      });
    } catch (erro) {
      throw classificarErroGemini(erro, sinal.aborted);
    }

    const uso = resposta.usageMetadata;
    const tokensEntrada = uso?.promptTokenCount ?? 0;
    // Tokens de "raciocínio" também são cobrados como saída.
    const tokensSaida = (uso?.candidatesTokenCount ?? 0) + (uso?.thoughtsTokenCount ?? 0);

    const texto = resposta.text;
    if (!texto) {
      throw new ErroIA(
        "resposta_invalida",
        `Resposta vazia (finishReason: ${resposta.candidates?.[0]?.finishReason ?? "?"})`,
      );
    }

    try {
      return { json: JSON.parse(texto), tokensEntrada, tokensSaida };
    } catch (erro) {
      throw new ErroIA("resposta_invalida", "A resposta não é JSON", { cause: erro });
    }
  }
}

const CODIGOS_DE_REDE = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

/** Converte um erro do SDK do Gemini num ErroIA (puro: testado em gemini.test.ts). */
export function classificarErroGemini(erro: unknown, expirou: boolean): ErroIA {
  if (erro instanceof ErroIA) return erro;

  const nome = erro instanceof Error ? erro.name : "";
  if (expirou || nome === "TimeoutError" || nome === "AbortError") {
    return new ErroIA("tempo", "Tempo esgotado", { cause: erro });
  }

  if (erro instanceof ApiError) {
    if (erro.status === 429) {
      return new ErroIA("limite_provedor", erro.message, { cause: erro });
    }
    if (erro.status >= 500) return new ErroIA("ocupado", erro.message, { cause: erro });
    // 400 (pedido/modelo inválido), 401/403 (chave inválida), 404 (modelo inexistente)
    return new ErroIA("indisponivel", `HTTP ${erro.status}: ${erro.message}`, {
      cause: erro,
    });
  }

  const causa = (erro as { cause?: { code?: unknown } } | null)?.cause;
  const codigo = typeof causa?.code === "string" ? causa.code : "";
  if (
    CODIGOS_DE_REDE.has(codigo) ||
    (erro instanceof TypeError && /fetch failed|network/i.test(erro.message))
  ) {
    return new ErroIA("conexao", codigo || (erro as Error).message, { cause: erro });
  }

  return new ErroIA("indisponivel", erro instanceof Error ? erro.message : String(erro), {
    cause: erro,
  });
}
