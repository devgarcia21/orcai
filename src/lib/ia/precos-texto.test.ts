import { describe, expect, it } from "vitest";

import type { ItemHistorico } from "./historico";
import { valoresNoTexto } from "./precos-texto";
import { normalizarResposta, valorInformado } from "./resposta";

describe("valoresNoTexto", () => {
  it("lê os formatos brasileiros de dinheiro", () => {
    expect([...valoresNoTexto("chuveiro por 150 reais")]).toEqual([15_000]);
    expect([...valoresNoTexto("R$ 20,50 cada")]).toEqual([2_050]);
    expect([...valoresNoTexto("R$ 1.500,00 a pintura")]).toEqual([150_000]);
    expect([...valoresNoTexto("R$ 1.500")]).toEqual([150_000]);
    expect([...valoresNoTexto("12.5 reais")]).toEqual([1_250]);
    expect([...valoresNoTexto("1,5 mil de material")]).toEqual([150_000]);
    expect([...valoresNoTexto("2 mil")]).toEqual([200_000]);
  });

  it("devolve todos os números (quantidades também): a IA indica qual é o preço", () => {
    expect(valoresNoTexto("3 tomadas a 20 reais cada")).toEqual(new Set([300, 2_000]));
    expect(valoresNoTexto("trocar tomadas")).toEqual(new Set());
  });
});

describe("valorInformado (preço escrito pelo prestador)", () => {
  const texto = (t: string) => valoresNoTexto(t);

  it("'3 tomadas a 20 reais cada' → R$ 20 por unidade", () => {
    expect(
      valorInformado(
        {
          quantidade: 3,
          valor_informado_centavos: 2_000,
          valor_informado_tipo: "unitario",
        },
        texto("3 tomadas a 20 reais cada"),
      ),
    ).toEqual({ valor: 2_000, arredondado: false });
  });

  it("'3 tomadas por 60 reais' → total dividido: R$ 20 por unidade", () => {
    expect(
      valorInformado(
        { quantidade: 3, valor_informado_centavos: 6_000, valor_informado_tipo: "total" },
        texto("3 tomadas por 60 reais"),
      ),
    ).toEqual({ valor: 2_000, arredondado: false, total: 6_000 });
  });

  it("total que não divide certinho é arredondado e marcado para aviso", () => {
    expect(
      valorInformado(
        {
          quantidade: 3,
          valor_informado_centavos: 10_000,
          valor_informado_tipo: "total",
        },
        texto("3 tomadas por 100 reais"),
      ),
    ).toEqual({ valor: 3_333, arredondado: true, total: 10_000 });
  });

  it("se a IA já dividiu o total escrito e marcou 'unitario', também aceita", () => {
    expect(
      valorInformado(
        {
          quantidade: 3,
          valor_informado_centavos: 2_000,
          valor_informado_tipo: "unitario",
        },
        texto("3 tomadas por 60 reais"),
      ),
    ).toEqual({ valor: 2_000, arredondado: false });
  });

  it("valor que NÃO está no texto é rejeitado (a IA não inventa preço)", () => {
    for (const tipo of ["unitario", "total"] as const) {
      expect(
        valorInformado(
          { quantidade: 1, valor_informado_centavos: 15_000, valor_informado_tipo: tipo },
          texto("instalar um chuveiro"),
        ),
      ).toBeNull();
    }
  });

  it("sem valor ou sem tipo → null", () => {
    const t = texto("chuveiro por 150 reais");
    expect(valorInformado({ quantidade: 1 }, t)).toBeNull();
    expect(
      valorInformado(
        { quantidade: 1, valor_informado_centavos: 15_000, valor_informado_tipo: null },
        t,
      ),
    ).toBeNull();
  });
});

describe("normalizarResposta: prioridade texto → histórico → vazio", () => {
  const HISTORICO: ItemHistorico[] = [
    {
      descricao: "Instalação de chuveiro",
      unidade: "un",
      valor_unitario_centavos: 12_000,
    },
    { descricao: "Troca de tomada", unidade: "un", valor_unitario_centavos: 4_500 },
  ];
  const item = (extra: Record<string, unknown>) => ({
    quantidade: 1,
    unidade: "un",
    indice_historico: null,
    valor_informado_centavos: null,
    valor_informado_tipo: null,
    ...extra,
  });

  it("valor escrito no texto vence o histórico; sem ele, histórico; sem os dois, vazio", () => {
    const r = normalizarResposta(
      {
        titulo: "Elétrica",
        itens: [
          item({
            descricao: "Instalação de chuveiro",
            indice_historico: 0,
            valor_informado_centavos: 15_000,
            valor_informado_tipo: "total",
          }),
          item({ descricao: "Troca de tomada", quantidade: 3, indice_historico: 1 }),
          item({ descricao: "Troca de disjuntor" }),
        ],
      },
      HISTORICO,
      "instalar um chuveiro por 150 reais, trocar 3 tomadas e o disjuntor",
    );
    expect(
      r.itens.map((i) => [i.descricao, i.valor_unitario_centavos, i.origem_valor]),
    ).toEqual([
      ["Instalação de chuveiro", 15_000, "informado"],
      ["Troca de tomada", 4_500, "historico"],
      ["Troca de disjuntor", null, null],
    ]);
  });

  it("valor 'informado' que não aparece no texto cai para o histórico", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({
            descricao: "Instalação de chuveiro",
            indice_historico: 0,
            valor_informado_centavos: 99_900,
            valor_informado_tipo: "unitario",
          }),
        ],
      },
      HISTORICO,
      "instalar um chuveiro",
    );
    expect(r.itens[0]).toMatchObject({
      valor_unitario_centavos: 12_000,
      origem_valor: "historico",
    });
  });

  it("'3 tomadas a 20 reais cada' vs. '3 tomadas por 60 reais': os dois dão R$ 20 cada", () => {
    const gerar = (texto: string, valor: number, tipo: "unitario" | "total") =>
      normalizarResposta(
        {
          titulo: "",
          itens: [
            item({
              descricao: "Troca de tomada",
              quantidade: 3,
              valor_informado_centavos: valor,
              valor_informado_tipo: tipo,
            }),
          ],
        },
        [],
        texto,
      ).itens[0].valor_unitario_centavos;
    expect(gerar("3 tomadas a 20 reais cada", 2_000, "unitario")).toBe(2_000);
    expect(gerar("3 tomadas por 60 reais", 6_000, "total")).toBe(2_000);
  });

  it("avisa quando o total foi dividido com arredondamento", () => {
    const r = normalizarResposta(
      {
        titulo: "",
        itens: [
          item({
            descricao: "Troca de tomada",
            quantidade: 3,
            valor_informado_centavos: 10_000,
            valor_informado_tipo: "total",
          }),
        ],
      },
      [],
      "3 tomadas por 100 reais",
    );
    expect(r.itens[0].valor_unitario_centavos).toBe(3_333);
    expect(r.avisos.join(" ").replace(/ /g, " ")).toContain(
      '"Troca de tomada": R$ 100,00 ÷ 3 = R$ 33,33 cada (arredondado)',
    );
  });
});
