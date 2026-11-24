import { describe, expect, it } from "vitest";

import {
  LIMITE_HISTORICO,
  palavrasChave,
  palavrasEmComum,
  selecionarHistorico,
  type ItemHistorico,
} from "./historico";

const item = (
  descricao: string,
  valor: number,
  unidade: ItemHistorico["unidade"] = "un",
): ItemHistorico => ({ descricao, unidade, valor_unitario_centavos: valor });

describe("palavrasChave", () => {
  it("ignora acentos, maiúsculas, palavras curtas e plural simples", () => {
    expect([...palavrasChave("Troca de 3 Tomadas com espelho")]).toEqual([
      "troca",
      "tomada",
      "espelho",
    ]);
    expect(palavrasEmComum("Instalação de chuveiro", "instalar CHUVEIRO elétrico")).toBe(
      1,
    );
  });
});

describe("selecionarHistorico", () => {
  it("sem itens anteriores, devolve lista vazia", () => {
    expect(selecionarHistorico([], "trocar tomadas")).toEqual([]);
  });

  it("ignora itens sem valor e sem descrição", () => {
    const r = selecionarHistorico(
      [item("Visita", 0), item("  ", 5000), item("Tomada", 1500)],
      "",
    );
    expect(r).toEqual([item("Tomada", 1500)]);
  });

  it("remove repetidos ficando com o mais recente (o preço atual)", () => {
    const r = selecionarHistorico(
      [
        item("Troca de tomada", 6000),
        item("troca de TOMADA", 4500),
        item("Troca de tomada", 9000, "servico"),
      ],
      "",
    );
    expect(r).toEqual([
      item("Troca de tomada", 6000),
      item("Troca de tomada", 9000, "servico"),
    ]);
  });

  it("prioriza itens com palavras do pedido; no empate, os mais recentes", () => {
    const r = selecionarHistorico(
      [
        item("Pintura de parede", 2500, "m2"),
        item("Instalação de chuveiro", 12000),
        item("Troca de tomada", 4500),
        item("Reparo de chuveiro", 8000),
      ],
      "trocar o chuveiro e 2 tomadas",
    );
    expect(r.map((i) => i.descricao)).toEqual([
      "Instalação de chuveiro",
      "Troca de tomada",
      "Reparo de chuveiro",
      "Pintura de parede",
    ]);
  });

  it(`envia no máximo ${LIMITE_HISTORICO} itens`, () => {
    const muitos = Array.from({ length: 80 }, (_, i) => item(`Serviço ${i}`, 1000 + i));
    const r = selecionarHistorico(muitos, "");
    expect(r).toHaveLength(LIMITE_HISTORICO);
    expect(r[0].descricao).toBe("Serviço 0"); // mais recente primeiro
    expect(selecionarHistorico(muitos, "", 5)).toHaveLength(5);
  });

  it("o limite mantém os relevantes mesmo que sejam antigos", () => {
    const antigos = [
      ...Array.from({ length: 60 }, (_, i) => item(`Pintura ${i}`, 1000)),
      item("Chuveiro elétrico", 15000),
    ];
    const r = selecionarHistorico(antigos, "instalar chuveiro");
    expect(r[0].descricao).toBe("Chuveiro elétrico");
  });
});
