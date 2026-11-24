import { describe, expect, it } from "vitest";

import { UNIDADES_ITEM } from "@/lib/types/database";

import { normalizarUnidade } from "./unidades";

describe("normalizarUnidade", () => {
  it("aceita todas as unidades do Orçaí como estão", () => {
    for (const u of UNIDADES_ITEM) expect(normalizarUnidade(u)).toBe(u);
  });

  it.each([
    ["UN", "un"],
    ["Unidade", "un"],
    ["peças", "un"],
    ["pç", "un"],
    ["Metros", "m"],
    ["mt", "m"],
    ["metro linear", "m"],
    ["m²", "m2"],
    ["Metro quadrado", "m2"],
    ["m³", "m3"],
    ["metros cúbicos", "m3"],
    ["horas", "h"],
    ["hr", "h"],
    ["diária", "dia"],
    ["dias", "dia"],
    ["Serviço", "servico"],
    ["vb", "servico"],
    ["  global ", "servico"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarUnidade(entrada)).toBe(esperado);
  });

  it("devolve null para unidades desconhecidas ou valores que não são texto", () => {
    expect(normalizarUnidade("kg")).toBeNull();
    expect(normalizarUnidade("litro")).toBeNull();
    expect(normalizarUnidade("")).toBeNull();
    expect(normalizarUnidade(3)).toBeNull();
    expect(normalizarUnidade(null)).toBeNull();
  });
});
