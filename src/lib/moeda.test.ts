import { describe, expect, it } from "vitest";

import {
  centavosDaMascara,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarQuantidade,
  lerMoeda,
  lerQuantidade,
  MOEDA_MAXIMA_CENTAVOS,
} from "./moeda";

describe("formatarMoeda", () => {
  it("formata centavos no padrão brasileiro", () => {
    expect(formatarMoeda(123456)).toBe("R$ 1.234,56");
    expect(formatarMoeda(0)).toBe("R$ 0,00");
    expect(formatarMoeda(5)).toBe("R$ 0,05");
    expect(formatarMoeda(100000000)).toBe("R$ 1.000.000,00");
  });

  it("usa espaço comum (não o espaço especial do Intl)", () => {
    expect(formatarMoeda(100)).not.toContain(" ");
  });
});

describe("lerMoeda", () => {
  it("lê valores formatados", () => {
    expect(lerMoeda("R$ 1.234,56")).toBe(123456);
    expect(lerMoeda("R$1.234,56")).toBe(123456);
    expect(lerMoeda("1.000.000,00")).toBe(100000000);
  });

  it("lê valores sem formatação completa", () => {
    expect(lerMoeda("1234,56")).toBe(123456);
    expect(lerMoeda("12,5")).toBe(1250);
    expect(lerMoeda("0,99")).toBe(99);
    expect(lerMoeda("1.234")).toBe(123400);
    expect(lerMoeda("15")).toBe(1500);
    expect(lerMoeda(",50")).toBe(50);
  });

  it("arredonda mais de 2 casas decimais (meio para cima)", () => {
    expect(lerMoeda("1,005")).toBe(101);
    expect(lerMoeda("1,004")).toBe(100);
    expect(lerMoeda("0,999")).toBe(100);
  });

  it("é o inverso de formatarMoeda", () => {
    for (const centavos of [0, 1, 99, 100, 123456, 98765432]) {
      expect(lerMoeda(formatarMoeda(centavos))).toBe(centavos);
    }
  });

  it("rejeita textos inválidos", () => {
    expect(lerMoeda("")).toBeNull();
    expect(lerMoeda("abc")).toBeNull();
    expect(lerMoeda("1,2,3")).toBeNull();
    expect(lerMoeda("R$")).toBeNull();
  });
});

describe("centavosDaMascara", () => {
  it("cada dígito entra pela direita", () => {
    expect(centavosDaMascara("1")).toBe(1);
    expect(centavosDaMascara("12")).toBe(12);
    expect(centavosDaMascara("1234")).toBe(1234);
  });

  it("ignora a formatação já exibida no campo", () => {
    expect(centavosDaMascara("R$ 12,345")).toBe(12345);
    expect(centavosDaMascara("R$ 0,001")).toBe(1);
  });

  it("campo vazio vale zero", () => {
    expect(centavosDaMascara("")).toBe(0);
    expect(centavosDaMascara("R$ 0,00")).toBe(0);
  });

  it("respeita o valor máximo", () => {
    expect(centavosDaMascara("999999999999999")).toBe(MOEDA_MAXIMA_CENTAVOS);
  });
});

describe("lerQuantidade", () => {
  it("lê inteiros e decimais com vírgula", () => {
    expect(lerQuantidade("10")).toBe(10);
    expect(lerQuantidade("2,5")).toBe(2.5);
    expect(lerQuantidade("0,75")).toBe(0.75);
    expect(lerQuantidade("1.000,25")).toBe(1000.25);
    expect(lerQuantidade("1.000")).toBe(1000);
  });

  it("aceita ponto como decimal quando há 1 ou 2 casas", () => {
    expect(lerQuantidade("2.5")).toBe(2.5);
    expect(lerQuantidade("2.75")).toBe(2.75);
  });

  it("rejeita mais de 2 casas decimais e textos inválidos", () => {
    expect(lerQuantidade("1,234")).toBeNull();
    expect(lerQuantidade("")).toBeNull();
    expect(lerQuantidade("abc")).toBeNull();
    expect(lerQuantidade("1,2,3")).toBeNull();
    expect(lerQuantidade("1.5.3")).toBeNull();
    expect(lerQuantidade("-2")).toBeNull();
  });
});

describe("formatarQuantidade", () => {
  it("usa vírgula e omite zeros desnecessários", () => {
    expect(formatarQuantidade(2.5)).toBe("2,5");
    expect(formatarQuantidade(10)).toBe("10");
    expect(formatarQuantidade(1000)).toBe("1.000");
  });
});

describe("formatarMoedaCompacta", () => {
  const sem = (t: string) => t.replace(/ /g, " ");
  it("abrevia valores grandes para rótulos de gráfico", () => {
    expect(sem(formatarMoedaCompacta(1_234_500))).toBe("R$ 12,3 mil");
    expect(sem(formatarMoedaCompacta(123_456_700))).toBe("R$ 1,2 mi");
  });
  it("valores abaixo de R$ 1.000 continuam por extenso (sem ,00)", () => {
    expect(sem(formatarMoedaCompacta(45_000))).toBe("R$ 450");
    expect(sem(formatarMoedaCompacta(45_050))).toBe("R$ 450,50");
    expect(sem(formatarMoedaCompacta(0))).toBe("R$ 0");
  });
});
