import { describe, expect, it } from "vitest";

import type { ItemHistorico } from "./historico";
import { MAXIMO_ITENS_IA } from "./prompt";
import { ErroIA } from "./provedor";
import { normalizarResposta, valorDoHistorico } from "./resposta";

const HISTORICO: ItemHistorico[] = [
  { descricao: "Troca de tomada", unidade: "un", valor_unitario_centavos: 4500 },
  {
    descricao: "Instalação de chuveiro elétrico",
    unidade: "un",
    valor_unitario_centavos: 12000,
  },
  { descricao: "Fio elétrico 2,5 mm²", unidade: "m", valor_unitario_centavos: 390 },
];

const item = (extra: Record<string, unknown> = {}) => ({
  descricao: "Troca de tomada",
  quantidade: 3,
  unidade: "un",
  indice_historico: null,
  valor_unitario_centavos: null,
  ...extra,
});

describe("normalizarResposta: validação", () => {
  it("aceita uma resposta correta", () => {
    const r = normalizarResposta(
      {
        titulo: "  Instalação   elétrica ",
        itens: [
          item(),
          item({ descricao: "Passagem de fio", quantidade: 10, unidade: "m" }),
        ],
      },
      [],
    );
    expect(r.titulo).toBe("Instalação elétrica");
    expect(r.itens).toEqual([
      {
        descricao: "Troca de tomada",
        quantidade: 3,
        unidade: "un",
        valor_unitario_centavos: null,
        origem_valor: null,
      },
      {
        descricao: "Passagem de fio",
        quantidade: 10,
        unidade: "m",
        valor_unitario_centavos: null,
        origem_valor: null,
      },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it("resposta fora do formato geral é inválida (ErroIA resposta_invalida)", () => {
    for (const ruim of [null, "texto livre", [], { titulo: "x" }, { itens: "nada" }]) {
      let capturado: unknown;
      try {
        normalizarResposta(ruim, []);
      } catch (e) {
        capturado = e;
      }
      expect(capturado).toBeInstanceOf(ErroIA);
      expect((capturado as ErroIA).tipo).toBe("resposta_invalida");
    }
  });

  it("descarta só os itens com problema e avisa", () => {
    const r = normalizarResposta(
      {
        titulo: "Reparo",
        itens: [
          item(),
          item({ descricao: "   " }), // sem descrição
          item({ descricao: "Pintura", quantidade: 0 }), // quantidade zero
          item({ descricao: "Reboco", quantidade: -2 }),
          item({ descricao: "Areia", unidade: "kg" }), // unidade que não existe
          item({ descricao: "Cimento", quantidade: "muito" }),
          "não é um item",
          null,
        ],
      },
      [],
    );
    expect(r.itens.map((i) => i.descricao)).toEqual(["Troca de tomada"]);
    expect(r.avisos).toEqual([
      "7 itens vieram incompletos da IA e foram descartados. Confira se falta algo.",
    ]);
  });

  it("um item descartado: aviso no singular", () => {
    const r = normalizarResposta(
      { titulo: "", itens: [item(), item({ descricao: "" })] },
      [],
    );
    expect(r.avisos).toEqual([
      "1 item veio incompleto da IA e foi descartado. Confira se falta algo.",
    ]);
  });

  it("normaliza quantidade (2 casas, texto com vírgula) e unidade (sinônimos)", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({ descricao: "Pintura", quantidade: 12.345, unidade: "m²" }),
          item({ descricao: "Fio", quantidade: "2,5", unidade: "metros" }),
          item({ descricao: "Mão de obra", quantidade: 1, unidade: "Serviço" }),
        ],
      },
      [],
    );
    expect(r.itens.map((i) => [i.quantidade, i.unidade])).toEqual([
      [12.35, "m2"],
      [2.5, "m"],
      [1, "servico"],
    ]);
  });

  it("junta itens repetidos somando as quantidades", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({ quantidade: 2 }),
          item({ descricao: "troca de TOMADA", quantidade: 1 }),
        ],
      },
      [],
    );
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].quantidade).toBe(3);
    expect(r.avisos[0]).toBe("Um item repetido foi juntado (quantidades somadas).");
  });

  it("título que não é texto vira vazio; título longo é cortado", () => {
    expect(normalizarResposta({ titulo: 42, itens: [item()] }, []).titulo).toBe("");
    expect(
      normalizarResposta({ titulo: "a".repeat(400), itens: [item()] }, []).titulo,
    ).toHaveLength(150);
  });

  it(`corta em ${MAXIMO_ITENS_IA} itens e avisa`, () => {
    const itens = Array.from({ length: 35 }, (_, i) => item({ descricao: `Item ${i}` }));
    const r = normalizarResposta({ titulo: "", itens }, []);
    expect(r.itens).toHaveLength(MAXIMO_ITENS_IA);
    expect(r.avisos).toContain(`Mostrando só os primeiros ${MAXIMO_ITENS_IA} itens.`);
  });
});

describe("preço: só com correspondência no histórico", () => {
  it("sem histórico, todo valor vem vazio — mesmo que a IA invente um", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({ valor_unitario_centavos: 9999 }),
          item({
            descricao: "Chuveiro",
            indice_historico: 0,
            valor_unitario_centavos: 5000,
          }),
        ],
      },
      [],
    );
    expect(r.itens.map((i) => i.valor_unitario_centavos)).toEqual([null, null]);
  });

  it("com correspondência, o valor vem DO HISTÓRICO (não do número da IA)", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({ indice_historico: 0, valor_unitario_centavos: 4500 }),
          item({
            descricao: "Instalação de chuveiro",
            quantidade: 1,
            indice_historico: 1,
            valor_unitario_centavos: 1,
          }),
        ],
      },
      HISTORICO,
    );
    expect(r.itens.map((i) => i.valor_unitario_centavos)).toEqual([4500, 12000]);
  });

  it("valor da IA sem índice do histórico é descartado", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [item({ descricao: "Troca de disjuntor", valor_unitario_centavos: 4500 })],
      },
      HISTORICO,
    );
    expect(r.itens[0].valor_unitario_centavos).toBeNull();
  });

  it("índice com unidade diferente não vale", () => {
    expect(
      valorDoHistorico(
        { descricao: "Fio elétrico", unidade: "un", indice_historico: 2 },
        HISTORICO,
      ),
    ).toBeNull();
    expect(
      valorDoHistorico(
        { descricao: "Fio elétrico", unidade: "m", indice_historico: 2 },
        HISTORICO,
      ),
    ).toBe(390);
  });

  it("índice apontando para um item sem nada a ver não vale", () => {
    expect(
      valorDoHistorico(
        { descricao: "Pintura de parede", unidade: "un", indice_historico: 0 },
        HISTORICO,
      ),
    ).toBeNull();
  });

  it("índice fora da lista, negativo ou quebrado não vale", () => {
    for (const indice of [3, -1, 1.5, null, undefined]) {
      expect(
        valorDoHistorico(
          {
            descricao: "Instalação de chuveiro",
            unidade: "un",
            indice_historico: indice,
          },
          HISTORICO,
        ),
      ).toBeNull();
    }
  });

  it("descrição IGUAL à do histórico (sem acento) e mesma unidade preenche sem índice", () => {
    expect(
      valorDoHistorico(
        { descricao: "instalacao de chuveiro ELETRICO", unidade: "un" },
        HISTORICO,
      ),
    ).toBe(12000);
    expect(
      valorDoHistorico(
        { descricao: "Instalação de chuveiro elétrico", unidade: "servico" },
        HISTORICO,
      ),
    ).toBeNull();
  });
});
