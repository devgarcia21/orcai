import { describe, expect, it } from "vitest";

import {
  crc16,
  formatarValorPix,
  gerarBrCode,
  lerTlv,
  limparTexto,
  txidOrcamento,
  type DadosBrCode,
} from "./brcode";
import { normalizarChavePix } from "./chave";

/** Payload válido (atalho para os testes). */
function payload(dados: DadosBrCode): string {
  const r = gerarBrCode(dados);
  if (!r.ok) throw new Error(r.erro);
  return r.payload;
}

/** IDs dos campos na ordem em que aparecem (Object.keys reordenaria "26" antes de "00"). */
function idsEmOrdem(p: string): string[] {
  const ids: string[] = [];
  for (let i = 0; i < p.length; i += 4 + Number(p.slice(i + 2, i + 4)))
    ids.push(p.slice(i, i + 2));
  return ids;
}

/** Confere o CRC de um payload pronto (últimos 4 caracteres). */
const crcConfere = (p: string) => crc16(p.slice(0, -4)) === p.slice(-4);

const base: DadosBrCode = {
  tipoChave: "email",
  chave: "ana@exemplo.com",
  nomeRecebedor: "Ana Eletrica",
  cidade: "Campinas",
};

describe("crc16 (CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF)", () => {
  it("bate com o vetor de verificação padrão", () => {
    // Vetor clássico de checagem da CRC-16/CCITT-FALSE
    expect(crc16("123456789")).toBe("29B1");
  });

  it("devolve sempre 4 dígitos hexadecimais maiúsculos", () => {
    expect(crc16("")).toBe("FFFF");
    expect(crc16("A")).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe("gerarBrCode — exemplo oficial do Banco Central", () => {
  it("reproduz byte a byte o exemplo do Manual de Padrões para Iniciação do Pix", () => {
    // Manual de Padrões para Iniciação do Pix (BCB), exemplo de QR estático
    const oficial =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
      "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

    expect(
      payload({
        tipoChave: "aleatoria",
        chave: "123e4567-e12b-12d1-a456-426655440000",
        nomeRecebedor: "Fulano de Tal",
        cidade: "BRASILIA",
      }),
    ).toBe(oficial);
  });
});

describe("gerarBrCode — estrutura", () => {
  it("tem todos os campos obrigatórios na ordem do manual", () => {
    const p = payload({ ...base, valorCentavos: 12000, txid: "ORC0001ABC" });
    const campos = lerTlv(p);
    expect(idsEmOrdem(p)).toEqual([
      "00",
      "26",
      "52",
      "53",
      "54",
      "58",
      "59",
      "60",
      "62",
      "63",
    ]);
    expect(campos["00"]).toBe("01");
    expect(lerTlv(campos["26"])).toEqual({
      "00": "br.gov.bcb.pix",
      "01": "ana@exemplo.com",
    });
    expect(campos["52"]).toBe("0000");
    expect(campos["53"]).toBe("986");
    expect(campos["58"]).toBe("BR");
    expect(lerTlv(campos["62"])).toEqual({ "05": "ORC0001ABC" });
    expect(crcConfere(p)).toBe(true);
  });

  it("sem valor, omite o campo 54 (o pagador digita) e usa txid ***", () => {
    const campos = lerTlv(payload(base));
    expect(campos["54"]).toBeUndefined();
    expect(lerTlv(campos["62"])).toEqual({ "05": "***" });
  });
});

describe("valores", () => {
  it("formata centavos com ponto e 2 casas", () => {
    expect(formatarValorPix(12000)).toBe("120.00");
    expect(formatarValorPix(5997)).toBe("59.97");
    expect(formatarValorPix(5)).toBe("0.05");
    expect(formatarValorPix(123456789)).toBe("1234567.89");
  });

  it("coloca R$ 120,00 e R$ 59,97 no campo 54 com o CRC certo", () => {
    for (const [centavos, texto] of [
      [12000, "120.00"],
      [5997, "59.97"],
    ] as const) {
      const p = payload({ ...base, valorCentavos: centavos });
      expect(lerTlv(p)["54"]).toBe(texto);
      expect(p).toContain(`54${String(texto.length).padStart(2, "0")}${texto}`);
      expect(crcConfere(p)).toBe(true);
    }
  });

  it("rejeita valor negativo ou com fração de centavo", () => {
    expect(gerarBrCode({ ...base, valorCentavos: -1 }).ok).toBe(false);
    expect(gerarBrCode({ ...base, valorCentavos: 10.5 }).ok).toBe(false);
  });
});

describe("nome e cidade", () => {
  it("remove acentos e símbolos", () => {
    expect(limparTexto("João da Conceição & Filhos", 25)).toBe(
      "Joao da Conceicao Filhos",
    );
    expect(limparTexto("São José dos Campos", 15)).toBe("Sao Jose dos Ca");
  });

  it("corta no limite (nome 25, cidade 15) sem deixar espaço no fim", () => {
    const campos = lerTlv(
      payload({
        ...base,
        nomeRecebedor: "Construtora e Incorporadora Horizonte Azul do Brasil",
        cidade: "Santa Bárbara d'Oeste",
      }),
    );
    expect(campos["59"]).toBe("Construtora e Incorporado");
    expect(campos["59"]).toHaveLength(25);
    expect(campos["60"]).toBe("Santa Barbara d");
    expect(campos["60"].length).toBeLessThanOrEqual(15);
  });

  it("cidade com espaço na posição do corte não termina em espaço", () => {
    expect(limparTexto("Rio de Janeiro X", 15)).toBe("Rio de Janeiro");
  });

  it("exige nome e cidade", () => {
    expect(gerarBrCode({ ...base, cidade: "  " })).toMatchObject({ ok: false });
    expect(gerarBrCode({ ...base, nomeRecebedor: "!!!" })).toMatchObject({ ok: false });
  });
});

describe("txid", () => {
  it("ORC + número com 4 dígitos + referência, só letras e números", () => {
    expect(txidOrcamento(1, "a1b2c3d4")).toBe("ORC0001A1B2C3D4");
    expect(txidOrcamento(42, "0a-11_22")).toBe("ORC00420A1122");
  });

  it("nunca passa de 25 caracteres", () => {
    expect(txidOrcamento(123456, "abcdefghijklmnopqrstuvwxyz")).toHaveLength(25);
  });

  it("rejeita txid com símbolos ou longo demais", () => {
    expect(gerarBrCode({ ...base, txid: "ORC-0001" }).ok).toBe(false);
    expect(gerarBrCode({ ...base, txid: "A".repeat(26) }).ok).toBe(false);
  });
});

describe("chaves PIX (mesma regra do Perfil)", () => {
  const casos: [DadosBrCode["tipoChave"], string, string][] = [
    ["cpf", "529.982.247-25", "52998224725"],
    ["cnpj", "11.222.333/0001-81", "11222333000181"],
    ["telefone", "(11) 98765-4321", "+5511987654321"],
    ["telefone", "+5511987654321", "+5511987654321"],
    ["email", "  Ana@Exemplo.COM ", "ana@exemplo.com"],
    [
      "aleatoria",
      "123e4567-e12b-12d1-a456-426655440000",
      "123e4567-e12b-12d1-a456-426655440000",
    ],
  ];

  it.each(casos)("%s válida: %s → %s (no payload)", (tipo, entrada, esperada) => {
    const p = payload({ ...base, tipoChave: tipo, chave: entrada });
    expect(lerTlv(lerTlv(p)["26"])["01"]).toBe(esperada);
    expect(crcConfere(p)).toBe(true);
  });

  const invalidas: [DadosBrCode["tipoChave"], string][] = [
    ["cpf", "529.982.247-24"], // dígito verificador errado
    ["cpf", "111.111.111-11"], // sequência repetida
    ["cnpj", "11.222.333/0001-80"],
    ["telefone", "(00) 98765-4321"],
    ["telefone", "1234"],
    ["email", "ana@"],
    ["email", `${"a".repeat(70)}@exemplo.com`], // passa de 77 caracteres
    ["aleatoria", "nao-e-uma-chave"],
  ];

  it.each(invalidas)("%s inválida (%s) devolve erro claro", (tipo, entrada) => {
    const r = gerarBrCode({ ...base, tipoChave: tipo, chave: entrada });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/^Chave PIX inválida: /);
    expect(normalizarChavePix(tipo, entrada).ok).toBe(false);
  });
});
