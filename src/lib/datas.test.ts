import { describe, expect, it } from "vitest";

import { adicionarDias, dataISOValida, formatarData, hojeISO } from "./datas";

describe("formatarData", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA sem mudar o dia", () => {
    expect(formatarData("2026-11-23")).toBe("23/11/2026");
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
  });

  it("exibe timestamps no fuso de São Paulo", () => {
    // 02:00 UTC do dia 24 ainda é dia 23 em São Paulo (UTC-3)
    expect(formatarData("2026-11-24T02:00:00Z")).toBe("23/11/2026");
  });
});

describe("hojeISO", () => {
  it("usa o dia do Brasil, não o do UTC", () => {
    expect(hojeISO(new Date("2026-11-24T02:00:00Z"))).toBe("2026-11-23");
    expect(hojeISO(new Date("2026-11-24T12:00:00Z"))).toBe("2026-11-24");
  });
});

describe("adicionarDias", () => {
  it("soma 15 dias atravessando o mês e o ano", () => {
    expect(adicionarDias("2026-11-23", 15)).toBe("2026-12-08");
    expect(adicionarDias("2026-12-20", 15)).toBe("2027-01-04");
  });

  it("lida com fevereiro", () => {
    expect(adicionarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(adicionarDias("2027-02-28", 1)).toBe("2027-03-01");
  });
});

describe("dataISOValida", () => {
  it("aceita datas reais e rejeita impossíveis", () => {
    expect(dataISOValida("2026-11-23")).toBe(true);
    expect(dataISOValida("2026-02-30")).toBe(false);
    expect(dataISOValida("23/11/2026")).toBe(false);
    expect(dataISOValida("")).toBe(false);
  });
});
