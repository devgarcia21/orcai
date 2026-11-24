import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import { lerTlv } from "./brcode";
import { pixDoOrcamento, referenciaDoId } from "./orcamento";
import { desenharQrCode } from "./qrcode";

const prestador = {
  nome: "Ana Teste",
  nome_empresa: "Ana Elétrica & Reformas",
  cidade: "São José dos Campos - SP",
  tipo_chave_pix: "email" as const,
  chave_pix: "ana@exemplo.com",
};
const orcamento = {
  numero: 7,
  // 3 × R$ 45,00 + R$ 250,00 = R$ 385,00; − R$ 10,00 = R$ 375,00
  itens: [
    { quantidade: 3, valor_unitario_centavos: 4500 },
    { quantidade: 1, valor_unitario_centavos: 25000 },
  ],
  desconto_centavos: 1000,
  percentual_sinal: 30,
};
const referencia = referenciaDoId("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d");

describe("pixDoOrcamento", () => {
  it("usa o valor do sinal, com txid estável e dados limpos", () => {
    const pix = pixDoOrcamento({ prestador, orcamento, referencia });
    expect(pix).toMatchObject({
      disponivel: true,
      valorCentavos: 11250,
      rotulo: "Sinal (30%)",
    });
    if (!pix.disponivel) return;
    const campos = lerTlv(pix.payload);
    expect(campos["54"]).toBe("112.50");
    expect(campos["59"]).toBe("Ana Eletrica Reformas");
    expect(campos["60"]).toBe("Sao Jose dos Ca");
    expect(lerTlv(campos["62"])["05"]).toBe("ORC00070A1B2C3D");
    // Mesmo orçamento → mesmo código (o QR não muda a cada abertura)
    expect(pixDoOrcamento({ prestador, orcamento, referencia })).toEqual(pix);
  });

  it("com sinal de 0%, cobra o valor total", () => {
    const pix = pixDoOrcamento({
      prestador,
      orcamento: { ...orcamento, percentual_sinal: 0 },
      referencia,
    });
    expect(pix).toMatchObject({
      disponivel: true,
      valorCentavos: 37500,
      rotulo: "Valor total",
    });
  });

  it("indisponível sem chave PIX, com chave inválida ou sem cidade", () => {
    expect(
      pixDoOrcamento({
        prestador: { ...prestador, chave_pix: null },
        orcamento,
        referencia,
      }),
    ).toMatchObject({ disponivel: false });
    expect(
      pixDoOrcamento({
        prestador: { ...prestador, tipo_chave_pix: "cpf", chave_pix: "12345678900" },
        orcamento,
        referencia,
      }),
    ).toMatchObject({ disponivel: false, motivo: expect.stringMatching(/CPF inválido/) });
    expect(
      pixDoOrcamento({ prestador: { ...prestador, cidade: " " }, orcamento, referencia }),
    ).toMatchObject({ disponivel: false, motivo: expect.stringMatching(/cidade/) });
  });

  it("indisponível quando não há valor a pagar", () => {
    expect(
      pixDoOrcamento({ prestador, orcamento: { ...orcamento, itens: [] }, referencia }),
    ).toMatchObject({ disponivel: false });
  });
});

describe("desenharQrCode", () => {
  it("gera um caminho SVG com margem de 4 módulos", () => {
    const { lado, caminho } = desenharQrCode("teste");
    expect(lado).toBe(21 + 8); // QR versão 1 (21×21) + 2 × 4 de margem
    expect(caminho).toMatch(/^M4 4h7v1h-7z/); // canto do padrão de localização
  });
});

/**
 * "Lê" o QR Code desenhado: pinta o caminho SVG (retângulos "M x y h w v1 h-w z")
 * numa imagem em memória e decodifica com o jsQR — um leitor independente.
 * Prova que o DESENHO (não só a biblioteca) gera um QR legível com o payload exato.
 */
function lerQrDesenhado(texto: string): string | null {
  const { lado, caminho } = desenharQrCode(texto);
  const escala = 6;
  const largura = lado * escala;
  const pixels = new Uint8ClampedArray(largura * largura * 4).fill(255); // fundo branco
  for (const [, x, y, w] of caminho.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let py = Number(y) * escala; py < (Number(y) + 1) * escala; py++) {
      for (let px = Number(x) * escala; px < (Number(x) + Number(w)) * escala; px++) {
        const i = (py * largura + px) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
  }
  return jsQR(pixels, largura, largura)?.data ?? null;
}

describe("QR Code legível", () => {
  it("o desenho decodifica exatamente para o PIX Copia e Cola", () => {
    const pix = pixDoOrcamento({ prestador, orcamento, referencia });
    if (!pix.disponivel) throw new Error("PIX deveria estar disponível");
    expect(lerQrDesenhado(pix.payload)).toBe(pix.payload);
  });

  it("funciona também com payloads longos (chave aleatória + nome no limite)", () => {
    const pix = pixDoOrcamento({
      prestador: {
        ...prestador,
        nome_empresa: "Construtora e Incorporadora Horizonte Azul",
        tipo_chave_pix: "aleatoria",
        chave_pix: "123e4567-e12b-12d1-a456-426655440000",
      },
      orcamento: { ...orcamento, percentual_sinal: 0 },
      referencia,
    });
    if (!pix.disponivel) throw new Error("PIX deveria estar disponível");
    expect(lerQrDesenhado(pix.payload)).toBe(pix.payload);
  });
});
