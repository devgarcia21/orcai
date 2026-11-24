import { describe, expect, it } from "vitest";

import { itemEmBranco, juntarItens } from "./aplicar";

const it_ = (descricao: string, valor = 0) => ({
  descricao,
  valor_unitario_centavos: valor,
});

describe("juntarItens", () => {
  it("acrescenta no fim sem apagar os existentes", () => {
    const r = juntarItens([it_("Tomada", 1000)], [it_("Chuveiro"), it_("Fio")], 100);
    expect(r.itens.map((i) => i.descricao)).toEqual(["Tomada", "Chuveiro", "Fio"]);
    expect(r).toMatchObject({ adicionados: 2, cortados: 0 });
  });

  it("descarta só as linhas em branco (o item vazio de um orçamento novo)", () => {
    const r = juntarItens([it_(""), it_("", 500), it_("Tomada")], [it_("Chuveiro")], 100);
    expect(r.itens.map((i) => i.descricao)).toEqual(["", "Tomada", "Chuveiro"]);
    expect(itemEmBranco(it_("  "))).toBe(true);
    expect(itemEmBranco(it_("", 1))).toBe(false);
  });

  it("respeita o máximo de itens do orçamento", () => {
    const r = juntarItens([it_("A"), it_("B")], [it_("C"), it_("D"), it_("E")], 3);
    expect(r.itens.map((i) => i.descricao)).toEqual(["A", "B", "C"]);
    expect(r).toMatchObject({ adicionados: 1, cortados: 2 });
  });
});
