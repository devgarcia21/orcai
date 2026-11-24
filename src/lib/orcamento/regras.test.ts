import { describe, expect, it } from "vitest";

import { clientePodeResponder, orcamentoVencido, podeEnviar } from "./regras";

const HOJE = "2026-11-23";

describe("orcamentoVencido", () => {
  it("vence só depois do último dia de validade", () => {
    expect(orcamentoVencido("2026-11-22", HOJE)).toBe(true);
    expect(orcamentoVencido("2026-11-23", HOJE)).toBe(false); // válido até hoje
    expect(orcamentoVencido("2026-12-08", HOJE)).toBe(false);
  });

  it("sem validade nunca vence", () => {
    expect(orcamentoVencido(null, HOJE)).toBe(false);
  });

  it("compara corretamente na virada de mês e de ano", () => {
    expect(orcamentoVencido("2026-12-31", "2027-01-01")).toBe(true);
    expect(orcamentoVencido("2026-09-30", "2026-10-01")).toBe(true);
  });
});

describe("clientePodeResponder", () => {
  it("só responde orçamento enviado e dentro da validade", () => {
    expect(
      clientePodeResponder({ status: "enviado", valido_ate: "2026-12-08" }, HOJE),
    ).toBe(true);
    expect(clientePodeResponder({ status: "enviado", valido_ate: HOJE }, HOJE)).toBe(
      true,
    );
    expect(clientePodeResponder({ status: "enviado", valido_ate: null }, HOJE)).toBe(
      true,
    );
  });

  it("não responde vencido", () => {
    expect(
      clientePodeResponder({ status: "enviado", valido_ate: "2026-11-22" }, HOJE),
    ).toBe(false);
  });

  it("não responde rascunho nem orçamento já respondido", () => {
    expect(clientePodeResponder({ status: "rascunho", valido_ate: null }, HOJE)).toBe(
      false,
    );
    expect(clientePodeResponder({ status: "aprovado", valido_ate: null }, HOJE)).toBe(
      false,
    );
    expect(clientePodeResponder({ status: "recusado", valido_ate: null }, HOJE)).toBe(
      false,
    );
  });
});

describe("podeEnviar", () => {
  it("rascunho e enviado podem ser enviados; respondidos não", () => {
    expect(podeEnviar("rascunho")).toBe(true);
    expect(podeEnviar("enviado")).toBe(true);
    expect(podeEnviar("aprovado")).toBe(false);
    expect(podeEnviar("recusado")).toBe(false);
  });
});
