import { describe, expect, it } from "vitest";

import {
  calcularResumo,
  descontoAplicado,
  subtotal,
  totalFinal,
  totalItem,
  valorSinal,
} from "./calculos";

describe("totalItem", () => {
  it("multiplica quantidade inteira pelo valor unitário", () => {
    expect(totalItem({ quantidade: 3, valor_unitario_centavos: 1500 })).toBe(4500);
  });

  it("aceita quantidades decimais como 2,5 m²", () => {
    // 2,5 m² × R$ 40,00 = R$ 100,00
    expect(totalItem({ quantidade: 2.5, valor_unitario_centavos: 4000 })).toBe(10000);
  });

  it("arredonda meio centavo para cima", () => {
    // 2,5 × R$ 19,99 = R$ 49,975 → R$ 49,98
    expect(totalItem({ quantidade: 2.5, valor_unitario_centavos: 1999 })).toBe(4998);
    // 0,5 × R$ 0,01 = R$ 0,005 → R$ 0,01
    expect(totalItem({ quantidade: 0.5, valor_unitario_centavos: 1 })).toBe(1);
  });

  it("arredonda para baixo abaixo de meio centavo", () => {
    // 0,33 × R$ 0,10 = R$ 0,033 → R$ 0,03
    expect(totalItem({ quantidade: 0.33, valor_unitario_centavos: 10 })).toBe(3);
  });

  it("não sofre com erros de ponto flutuante", () => {
    // Em float puro, 1.15 * 100 = 114.99999999999999
    expect(totalItem({ quantidade: 1.15, valor_unitario_centavos: 100 })).toBe(115);
    expect(totalItem({ quantidade: 0.1, valor_unitario_centavos: 30 })).toBe(3);
    expect(totalItem({ quantidade: 4.35, valor_unitario_centavos: 100 })).toBe(435);
  });

  it("retorna zero para quantidade ou valor inválidos", () => {
    expect(totalItem({ quantidade: 0, valor_unitario_centavos: 1000 })).toBe(0);
    expect(totalItem({ quantidade: -2, valor_unitario_centavos: 1000 })).toBe(0);
    expect(totalItem({ quantidade: Number.NaN, valor_unitario_centavos: 1000 })).toBe(0);
    expect(totalItem({ quantidade: 2, valor_unitario_centavos: 0 })).toBe(0);
  });
});

describe("subtotal", () => {
  it("soma os totais das linhas (cada uma já arredondada)", () => {
    const itens = [
      { quantidade: 2.5, valor_unitario_centavos: 1999 }, // 4998
      { quantidade: 1, valor_unitario_centavos: 15000 }, // 15000
      { quantidade: 3, valor_unitario_centavos: 333 }, // 999
    ];
    expect(subtotal(itens)).toBe(20997);
  });

  it("é zero sem itens", () => {
    expect(subtotal([])).toBe(0);
  });
});

describe("desconto", () => {
  it("aplica o desconto normalmente", () => {
    expect(descontoAplicado(10000, 2500)).toBe(2500);
    expect(totalFinal(10000, 2500)).toBe(7500);
  });

  it("nunca é maior que o subtotal", () => {
    expect(descontoAplicado(10000, 15000)).toBe(10000);
    expect(totalFinal(10000, 15000)).toBe(0);
  });

  it("nunca é negativo", () => {
    expect(descontoAplicado(10000, -500)).toBe(0);
    expect(totalFinal(10000, -500)).toBe(10000);
  });
});

describe("valorSinal", () => {
  it("é zero com 0%", () => {
    expect(valorSinal(12345, 0)).toBe(0);
  });

  it("é o total com 100%", () => {
    expect(valorSinal(12345, 100)).toBe(12345);
  });

  it("calcula o percentual e arredonda", () => {
    expect(valorSinal(10000, 30)).toBe(3000);
    // 50% de R$ 123,45 = R$ 61,725 → R$ 61,73
    expect(valorSinal(12345, 50)).toBe(6173);
  });

  it("limita o percentual entre 0 e 100", () => {
    expect(valorSinal(10000, 150)).toBe(10000);
    expect(valorSinal(10000, -10)).toBe(0);
  });
});

describe("calcularResumo", () => {
  it("calcula subtotal, desconto, total e sinal juntos", () => {
    const resumo = calcularResumo(
      [
        { quantidade: 2.5, valor_unitario_centavos: 4000 }, // 10000
        { quantidade: 1, valor_unitario_centavos: 25000 }, // 25000
      ],
      5000,
      30,
    );
    expect(resumo).toEqual({
      subtotal: 35000,
      desconto: 5000,
      total: 30000,
      sinal: 9000,
      percentualSinal: 30,
    });
  });

  it("com desconto maior que o subtotal, o total é zero e o sinal também", () => {
    const resumo = calcularResumo(
      [{ quantidade: 1, valor_unitario_centavos: 1000 }],
      5000,
      50,
    );
    expect(resumo.desconto).toBe(1000);
    expect(resumo.total).toBe(0);
    expect(resumo.sinal).toBe(0);
  });
});
