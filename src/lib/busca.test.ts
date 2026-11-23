import { describe, expect, it } from "vitest";

import { correspondeBusca, normalizarBusca } from "./busca";

describe("busca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalizarBusca("  Conceição ÁGUA ")).toBe("conceicao agua");
    expect(correspondeBusca("joao", ["João da Silva"])).toBe(true);
    expect(correspondeBusca("ELÉTRICA", ["Reforma eletrica"])).toBe(true);
  });

  it("termo vazio corresponde a tudo e campos nulos são ignorados", () => {
    expect(correspondeBusca("", ["qualquer"])).toBe(true);
    expect(correspondeBusca("maria", [null, undefined, "Maria"])).toBe(true);
    expect(correspondeBusca("pedro", [null, "Maria"])).toBe(false);
  });
});
