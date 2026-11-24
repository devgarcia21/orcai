import { describe, expect, it } from "vitest";

import {
  LIMITE_GERACOES_POR_HORA,
  mensagemLimiteAtingido,
  TEXTO_MAXIMO_IA,
  textoPedidoIaSchema,
} from "./limite";

describe("limites da IA", () => {
  it("são 30 gerações por hora e 1.500 caracteres", () => {
    expect(LIMITE_GERACOES_POR_HORA).toBe(30);
    expect(TEXTO_MAXIMO_IA).toBe(1500);
  });

  it("texto: aceita até 1.500 caracteres (sem contar espaços nas pontas)", () => {
    expect(textoPedidoIaSchema.safeParse("a".repeat(1500)).success).toBe(true);
    expect(textoPedidoIaSchema.safeParse(`  ${"a".repeat(1500)}  `).success).toBe(true);
    const longo = textoPedidoIaSchema.safeParse("a".repeat(1501));
    expect(longo.success).toBe(false);
    expect(longo.error?.issues[0].message).toBe("Use no máximo 1.500 caracteres.");
  });

  it("texto: vazio ou curto demais pede para descrever o serviço", () => {
    for (const t of ["", "  ", "oi", 42]) {
      expect(textoPedidoIaSchema.safeParse(t).success).toBe(false);
    }
  });

  it("mensagem do limite diz em quantos minutos libera", () => {
    const agora = new Date("2026-11-24T12:00:00Z");
    expect(mensagemLimiteAtingido("2026-11-24T12:12:30Z", agora)).toBe(
      "Você atingiu o limite de 30 gerações com IA por hora. Tente novamente em 13 minutos.",
    );
    expect(mensagemLimiteAtingido("2026-11-24T12:00:30Z", agora)).toMatch(
      /em instantes\.$/,
    );
    expect(mensagemLimiteAtingido(null, agora)).toMatch(/em instantes\.$/);
  });
});
