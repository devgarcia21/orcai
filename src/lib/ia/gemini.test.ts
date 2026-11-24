import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * O SDK do Gemini é substituído por um falso: nenhum teste chama a API.
 * `vi.hoisted` cria o mock antes dos imports (vi.mock é içado para o topo).
 */
const { generateContent, ApiErrorFalso } = vi.hoisted(() => {
  class ApiErrorFalso extends Error {
    constructor(readonly status: number) {
      super(`HTTP ${status}`);
    }
  }
  return { generateContent: vi.fn(), ApiErrorFalso };
});

vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  ApiError: ApiErrorFalso,
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { iaConfigurada, MODELO_GEMINI_PADRAO, obterProvedorIA } from "./configuracao";
import { classificarErroGemini, ProvedorGemini } from "./gemini";
import { ErroIA } from "./provedor";

const PEDIDO = {
  instrucoes: "regras",
  entrada: '{"descricao_do_servico":"trocar tomada"}',
  schema: { type: "object" },
  timeoutMs: 30_000,
};

// Chaves: se o beforeEach devolver uma função, o Vitest a chama como limpeza.
beforeEach(() => {
  generateContent.mockReset();
});

async function erroDe(promessa: Promise<unknown>): Promise<ErroIA> {
  try {
    await promessa;
  } catch (e) {
    return e as ErroIA;
  }
  throw new Error("deveria ter falhado");
}

describe("configuração", () => {
  it("sem GEMINI_API_KEY não há provedor (IA desativada)", () => {
    expect(obterProvedorIA({})).toBeNull();
    expect(obterProvedorIA({ GEMINI_API_KEY: "   " })).toBeNull();
    expect(iaConfigurada({})).toBe(false);
  });

  it("com a chave, usa o Gemini com o modelo padrão ou o de GEMINI_MODEL", async () => {
    generateContent.mockResolvedValue({ text: "{}", usageMetadata: {} });
    await obterProvedorIA({ GEMINI_API_KEY: "chave" })!.gerarJson(PEDIDO);
    expect(generateContent.mock.calls[0][0].model).toBe(MODELO_GEMINI_PADRAO);

    await obterProvedorIA({
      GEMINI_API_KEY: "chave",
      GEMINI_MODEL: "outro-modelo",
    })!.gerarJson(PEDIDO);
    expect(generateContent.mock.calls[1][0].model).toBe("outro-modelo");
    expect(iaConfigurada({ GEMINI_API_KEY: "chave" })).toBe(true);
  });
});

describe("ProvedorGemini", () => {
  const provedor = new ProvedorGemini("chave", "modelo-teste");

  it("pede JSON com schema (saída estruturada), instruções de sistema e timeout", async () => {
    generateContent.mockResolvedValue({
      text: '{"titulo":"x","itens":[]}',
      usageMetadata: {
        promptTokenCount: 900,
        candidatesTokenCount: 100,
        thoughtsTokenCount: 20,
      },
    });
    const r = await provedor.gerarJson(PEDIDO);

    expect(r).toEqual({
      json: { titulo: "x", itens: [] },
      tokensEntrada: 900,
      tokensSaida: 120,
    });
    const { model, contents, config } = generateContent.mock.calls[0][0];
    expect(model).toBe("modelo-teste");
    expect(contents).toBe(PEDIDO.entrada);
    expect(config).toMatchObject({
      systemInstruction: "regras",
      responseMimeType: "application/json",
      responseJsonSchema: PEDIDO.schema,
    });
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("429 → limite_provedor", async () => {
    generateContent.mockRejectedValue(new ApiErrorFalso(429));
    expect((await erroDe(provedor.gerarJson(PEDIDO))).tipo).toBe("limite_provedor");
  });

  it("resposta vazia ou que não é JSON → resposta_invalida", async () => {
    generateContent.mockResolvedValue({
      text: undefined,
      candidates: [{ finishReason: "SAFETY" }],
    });
    expect((await erroDe(provedor.gerarJson(PEDIDO))).tipo).toBe("resposta_invalida");
    generateContent.mockResolvedValue({ text: "Claro! Aqui estão os itens: ..." });
    expect((await erroDe(provedor.gerarJson(PEDIDO))).tipo).toBe("resposta_invalida");
  });

  it("passou do tempo → tempo (o sinal de timeout é respeitado)", async () => {
    generateContent.mockImplementation(
      ({ config }: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_, rejeitar) =>
          config.abortSignal.addEventListener("abort", () =>
            rejeitar(new DOMException("tempo", "TimeoutError")),
          ),
        ),
    );
    const erro = await erroDe(provedor.gerarJson({ ...PEDIDO, timeoutMs: 20 }));
    expect(erro.tipo).toBe("tempo");
  });
});

describe("classificarErroGemini", () => {
  it.each([
    [new ApiErrorFalso(429), "limite_provedor"],
    [new ApiErrorFalso(503), "ocupado"],
    [new ApiErrorFalso(500), "ocupado"],
    [new ApiErrorFalso(400), "indisponivel"],
    [new ApiErrorFalso(403), "indisponivel"],
    [
      Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }),
      "conexao",
    ],
    [new TypeError("fetch failed"), "conexao"],
    [new DOMException("x", "AbortError"), "tempo"],
    [new Error("qualquer"), "indisponivel"],
  ])("%s → %s", (erro, tipo) => {
    expect(classificarErroGemini(erro, false).tipo).toBe(tipo);
  });

  it("se o nosso timeout disparou, é sempre 'tempo'", () => {
    expect(classificarErroGemini(new Error("abortado"), true).tipo).toBe("tempo");
  });
});
