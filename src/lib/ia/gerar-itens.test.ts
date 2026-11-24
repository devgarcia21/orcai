import { describe, expect, it, vi } from "vitest";

import type { ReservaUsoIa } from "@/lib/types/database";

import { gerarItens, MENSAGEM_SEM_ITENS, type DependenciasGeracao } from "./gerar-itens";
import type { ItemHistorico } from "./historico";
import { ErroIA, type PedidoJson, type ProvedorIA, type RespostaJson } from "./provedor";

const AGORA = new Date("2026-11-24T12:00:00Z");

const RESPOSTA_BOA = {
  titulo: "Instalação elétrica",
  itens: [
    {
      descricao: "Troca de tomada",
      quantidade: 3,
      unidade: "un",
      indice_historico: 0,
      valor_unitario_centavos: 4500,
    },
    {
      descricao: "Instalação de chuveiro",
      quantidade: 1,
      unidade: "un",
      indice_historico: null,
      valor_unitario_centavos: null,
    },
  ],
};

/** Provedor falso: nunca chama a API de verdade. */
function provedorFalso(
  comportamento: (pedido: PedidoJson) => Promise<RespostaJson>,
): ProvedorIA & { gerarJson: ReturnType<typeof vi.fn> } {
  return { nome: "falso", gerarJson: vi.fn(comportamento) };
}

const respondeCom = (json: unknown) =>
  provedorFalso(async () => ({ json, tokensEntrada: 800, tokensSaida: 120 }));

function dependencias(extra: Partial<DependenciasGeracao> = {}) {
  const reserva: ReservaUsoIa = {
    permitido: true,
    usos: 1,
    liberado_em: null,
    uso_id: "uso-1",
  };
  return {
    provedor: respondeCom(RESPOSTA_BOA),
    reservarUso: vi.fn(async () => reserva),
    concluirUso: vi.fn(async () => {}),
    carregarHistorico: vi.fn(async (): Promise<ItemHistorico[]> => [
      { descricao: "Troca de tomada", unidade: "un", valor_unitario_centavos: 4500 },
    ]),
    agora: () => AGORA,
    registrarErro: vi.fn(),
    ...extra,
  } satisfies DependenciasGeracao;
}

/** O vi.fn do provedor falso, para conferir as chamadas. */
const gerarJsonDe = (deps: DependenciasGeracao) =>
  (deps.provedor as ReturnType<typeof provedorFalso>).gerarJson;

describe("gerarItens", () => {
  it("gera itens: valor do histórico quando corresponde, null quando não", async () => {
    const deps = dependencias();
    const r = await gerarItens("trocar 3 tomadas e instalar um chuveiro", deps);

    expect(r).toEqual({
      ok: true,
      itensNoHistorico: 1,
      sugestao: {
        titulo: "Instalação elétrica",
        avisos: [],
        itens: [
          {
            descricao: "Troca de tomada",
            quantidade: 3,
            unidade: "un",
            valor_unitario_centavos: 4500,
            origem_valor: "historico",
          },
          {
            descricao: "Instalação de chuveiro",
            quantidade: 1,
            unidade: "un",
            valor_unitario_centavos: null,
            origem_valor: null,
          },
        ],
      },
    });
    // Registra o consumo de tokens como sucesso.
    expect(deps.concluirUso).toHaveBeenCalledWith("uso-1", {
      tokensEntrada: 800,
      tokensSaida: 120,
      sucesso: true,
    });
  });

  it("envia instruções fixas, schema, timeout de 30 s e o histórico como referência", async () => {
    const deps = dependencias();
    await gerarItens("trocar tomada", deps);
    const pedido = gerarJsonDe(deps).mock.calls[0][0] as PedidoJson;
    expect(pedido.timeoutMs).toBe(30_000);
    expect(pedido.schema).toHaveProperty("properties.itens");
    expect(pedido.instrucoes).not.toContain("trocar tomada");
    expect(JSON.parse(pedido.entrada)).toEqual({
      descricao_do_servico: "trocar tomada",
      historico_de_precos: [
        {
          indice: 0,
          descricao: "Troca de tomada",
          unidade: "un",
          valor_unitario_centavos: 4500,
        },
      ],
    });
  });

  it("chave ausente: 'IA indisponível no momento', sem gastar o limite", async () => {
    const deps = dependencias({ provedor: null });
    const r = await gerarItens("trocar tomada", deps);
    expect(r).toEqual({ ok: false, mensagem: "IA indisponível no momento." });
    expect(deps.reservarUso).not.toHaveBeenCalled();
  });

  it("texto vazio ou longo demais: erro no campo, sem chamar a IA", async () => {
    const deps = dependencias();
    expect(await gerarItens("  ", deps)).toMatchObject({ ok: false, campo: "texto" });
    expect(await gerarItens("a".repeat(1501), deps)).toEqual({
      ok: false,
      campo: "texto",
      mensagem: "Use no máximo 1.500 caracteres.",
    });
    expect(deps.reservarUso).not.toHaveBeenCalled();
    expect(gerarJsonDe(deps)).not.toHaveBeenCalled();
  });

  it("limite por hora atingido: mensagem clara e a IA não é chamada", async () => {
    const deps = dependencias({
      reservarUso: vi.fn(async () => ({
        permitido: false,
        usos: 30,
        liberado_em: "2026-11-24T12:20:00Z",
        uso_id: null,
      })),
    });
    const r = await gerarItens("trocar tomada", deps);
    expect(r).toEqual({
      ok: false,
      mensagem:
        "Você atingiu o limite de 30 gerações com IA por hora. Tente novamente em 20 minutos.",
    });
    expect(gerarJsonDe(deps)).not.toHaveBeenCalled();
  });

  it("429 do Gemini: 'Muitas solicitações agora, tente novamente em instantes'", async () => {
    const deps = dependencias({
      provedor: provedorFalso(async () => {
        throw new ErroIA("limite_provedor", "RESOURCE_EXHAUSTED");
      }),
    });
    const r = await gerarItens("trocar tomada", deps);
    expect(r).toEqual({
      ok: false,
      mensagem: "Muitas solicitações agora, tente novamente em instantes.",
    });
    expect(deps.concluirUso).toHaveBeenCalledWith("uso-1", {
      tokensEntrada: 0,
      tokensSaida: 0,
      sucesso: false,
    });
  });

  it.each([
    ["tempo", "A IA demorou demais para responder. Tente novamente."],
    [
      "conexao",
      "Sem conexão com o serviço de IA. Confira a internet do servidor e tente de novo.",
    ],
    ["indisponivel", "IA indisponível no momento."],
  ] as const)("erro '%s' vira mensagem amigável", async (tipo, mensagem) => {
    const deps = dependencias({
      provedor: provedorFalso(async () => {
        throw new ErroIA(tipo);
      }),
    });
    expect(await gerarItens("trocar tomada", deps)).toEqual({ ok: false, mensagem });
  });

  it("resposta inválida (fora do formato): avisa sem quebrar e grava os tokens gastos", async () => {
    const deps = dependencias({ provedor: respondeCom({ resposta: "texto livre" }) });
    const r = await gerarItens("trocar tomada", deps);
    expect(r).toEqual({
      ok: false,
      mensagem:
        "A IA devolveu uma resposta inválida. Tente de novo ou descreva o serviço com outras palavras.",
    });
    expect(deps.concluirUso).toHaveBeenCalledWith("uso-1", {
      tokensEntrada: 800,
      tokensSaida: 120,
      sucesso: false,
    });
  });

  it("itens com problema são descartados com aviso; os bons continuam", async () => {
    const deps = dependencias({
      provedor: respondeCom({
        titulo: "Reparo",
        itens: [...RESPOSTA_BOA.itens, { descricao: "", quantidade: 1, unidade: "un" }],
      }),
    });
    const r = await gerarItens("trocar tomada", deps);
    expect(r.ok && r.sugestao.itens).toHaveLength(2);
    expect(r.ok && r.sugestao.avisos[0]).toMatch(/1 item veio incompleto/);
  });

  it("texto sem sentido (nenhum item): pede para descrever o serviço", async () => {
    const deps = dependencias({ provedor: respondeCom({ titulo: "", itens: [] }) });
    expect(await gerarItens("asdkjh qwe zxc", deps)).toEqual({
      ok: false,
      campo: "texto",
      mensagem: MENSAGEM_SEM_ITENS,
    });
  });

  it("erro inesperado do provedor: mensagem genérica e registra o erro", async () => {
    const deps = dependencias({
      provedor: provedorFalso(async () => {
        throw new Error("bug");
      }),
    });
    expect(await gerarItens("trocar tomada", deps)).toEqual({
      ok: false,
      mensagem: "IA indisponível no momento.",
    });
    expect(deps.registrarErro).toHaveBeenCalled();
  });

  it("falha ao gravar o consumo não estraga a resposta", async () => {
    const deps = dependencias({
      concluirUso: vi.fn(async () => {
        throw new Error("banco fora do ar");
      }),
    });
    const r = await gerarItens("trocar tomada", deps);
    expect(r.ok).toBe(true);
    expect(deps.registrarErro).toHaveBeenCalled();
  });
});
