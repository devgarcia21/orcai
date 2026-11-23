import { describe, expect, it } from "vitest";

import { orcamentoSchema, type OrcamentoEntrada } from "./orcamento";

const valido: OrcamentoEntrada = {
  cliente_id: "123e4567-e89b-42d3-a456-426614174000",
  titulo: "Troca de fiação",
  itens: [
    {
      descricao: "Piso",
      quantidade: "2,5",
      unidade: "m2",
      valor_unitario_centavos: 4000,
    },
  ],
  desconto_centavos: 0,
  percentual_sinal: 30,
  valido_ate: "2026-12-08",
  condicoes_pagamento: "",
  observacoes: "",
};

const errosDe = (entrada: OrcamentoEntrada) => {
  const r = orcamentoSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("orcamentoSchema", () => {
  it("aceita um orçamento válido e normaliza os campos", () => {
    const r = orcamentoSchema.parse(valido);
    expect(r.itens[0].quantidade).toBe(2.5);
    expect(r.condicoes_pagamento).toBeNull();
  });

  it("rejeita desconto maior que o subtotal (recalculado no servidor)", () => {
    // subtotal = 2,5 × R$ 40,00 = R$ 100,00
    expect(errosDe({ ...valido, desconto_centavos: 10001 })).toEqual([
      "desconto_centavos",
    ]);
    expect(errosDe({ ...valido, desconto_centavos: 10000 })).toEqual([]);
  });

  it("exige pelo menos um item e valida cada um", () => {
    expect(errosDe({ ...valido, itens: [] })).toEqual(["itens"]);
    expect(
      errosDe({
        ...valido,
        itens: [
          { descricao: " ", quantidade: "0", unidade: "m2", valor_unitario_centavos: -1 },
        ],
      }),
    ).toEqual([
      "itens.0.descricao",
      "itens.0.quantidade",
      "itens.0.valor_unitario_centavos",
    ]);
  });

  it("rejeita quantidade com mais de 2 casas e sinal fora de 0–100", () => {
    expect(
      errosDe({ ...valido, itens: [{ ...valido.itens[0], quantidade: "1,234" }] }),
    ).toEqual(["itens.0.quantidade"]);
    expect(errosDe({ ...valido, percentual_sinal: 101 })).toEqual(["percentual_sinal"]);
  });
});
