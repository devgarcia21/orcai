import { describe, expect, it } from "vitest";

import {
  mensagemContatoPrestador,
  mensagemEnvioOrcamento,
  mensagemLembreteOrcamento,
  montarLinkWhatsApp,
  normalizarTelefoneWhatsApp,
} from "./whatsapp";

describe("normalizarTelefoneWhatsApp", () => {
  it("adiciona o 55 e deixa só números", () => {
    expect(normalizarTelefoneWhatsApp("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizarTelefoneWhatsApp("11987654321")).toBe("5511987654321");
    expect(normalizarTelefoneWhatsApp("(21) 3456-7890")).toBe("552134567890");
  });

  it("aceita o 55 já incluído, com + ou 00", () => {
    expect(normalizarTelefoneWhatsApp("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizarTelefoneWhatsApp("5511987654321")).toBe("5511987654321");
    expect(normalizarTelefoneWhatsApp("0055 11 98765-4321")).toBe("5511987654321");
  });

  it("remove o 0 na frente do DDD", () => {
    expect(normalizarTelefoneWhatsApp("011 98765-4321")).toBe("5511987654321");
  });

  it("não confunde DDD 55 (RS) com o código do país", () => {
    // (55) 99123-4567 é um celular de Santa Maria/RS
    expect(normalizarTelefoneWhatsApp("(55) 99123-4567")).toBe("5555991234567");
  });

  it("devolve null para vazio ou inválido", () => {
    expect(normalizarTelefoneWhatsApp(null)).toBeNull();
    expect(normalizarTelefoneWhatsApp("")).toBeNull();
    expect(normalizarTelefoneWhatsApp("1234")).toBeNull();
    expect(normalizarTelefoneWhatsApp("(00) 98765-4321")).toBeNull();
    expect(normalizarTelefoneWhatsApp("11 8765-4321 ramal 2")).toBeNull();
  });
});

describe("montarLinkWhatsApp", () => {
  it("monta o link com número e codifica acentos e quebras de linha", () => {
    const link = montarLinkWhatsApp(
      "(11) 98765-4321",
      "Olá, João!\nOrçamento Nº 1 – ação",
    );
    expect(link).toBe(
      "https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Jo%C3%A3o!%0AOr%C3%A7amento%20N%C2%BA%201%20%E2%80%93%20a%C3%A7%C3%A3o",
    );
    // A mensagem volta idêntica ao decodificar
    expect(decodeURIComponent(new URL(link).searchParams.get("text") ?? "")).toBe(
      "Olá, João!\nOrçamento Nº 1 – ação",
    );
  });

  it("codifica símbolos que quebrariam a URL (&, #, +, ?)", () => {
    const link = montarLinkWhatsApp(null, "Silva & Filhos #1 + R$ 10? 100%");
    expect(new URL(link).searchParams.get("text")).toBe(
      "Silva & Filhos #1 + R$ 10? 100%",
    );
  });

  it("sem telefone válido, abre o WhatsApp para escolher o contato", () => {
    expect(montarLinkWhatsApp(null, "oi")).toBe("https://wa.me/?text=oi");
    expect(montarLinkWhatsApp("123", "oi")).toBe("https://wa.me/?text=oi");
  });
});

describe("mensagemEnvioOrcamento", () => {
  const base = {
    nomeCliente: "Maria da Conceição",
    numero: "0007",
    titulo: "Reforma elétrica",
    total: "R$ 340,00",
    validoAte: "08/12/2026",
    link: "https://orcai.app/o/abc123",
    assinatura: "Ana Elétrica",
  };

  it("tem saudação pelo primeiro nome, título, número, total, validade, link e assinatura", () => {
    expect(mensagemEnvioOrcamento(base)).toBe(
      [
        "Olá, Maria! Tudo bem?",
        "",
        "Segue o orçamento Nº 0007 – Reforma elétrica.",
        "Total: R$ 340,00",
        "Válido até 08/12/2026",
        "",
        "Veja os detalhes e aprove por aqui:",
        "https://orcai.app/o/abc123",
        "",
        "Ana Elétrica",
      ].join("\n"),
    );
  });

  it("omite a validade quando não há", () => {
    expect(mensagemEnvioOrcamento({ ...base, validoAte: null })).not.toContain(
      "Válido até",
    );
  });

  it("funciona com nome em branco", () => {
    expect(mensagemEnvioOrcamento({ ...base, nomeCliente: "  " })).toMatch(
      /^Olá! Tudo bem\?/,
    );
  });

  it("o link fica sozinho na linha (o WhatsApp o reconhece e gera a prévia)", () => {
    const linhas = mensagemEnvioOrcamento(base).split("\n");
    expect(linhas).toContain("https://orcai.app/o/abc123");
  });
});

describe("mensagemContatoPrestador", () => {
  it("menciona o número e o título", () => {
    expect(mensagemContatoPrestador("0007", "Reforma")).toBe(
      "Olá! Vi o orçamento Nº 0007 – Reforma e gostaria de conversar.",
    );
  });
});

describe("mensagemLembreteOrcamento", () => {
  it("pergunta com educação se o cliente viu o orçamento e manda o link", () => {
    expect(
      mensagemLembreteOrcamento({
        nomeCliente: "Maria Souza",
        numero: "0007",
        titulo: "Reforma elétrica",
        link: "https://orcai.app/o/abc",
        assinatura: "Ana Elétrica",
      }),
    ).toBe(
      [
        "Olá, Maria! Tudo bem?",
        "",
        "Conseguiu ver o orçamento Nº 0007 – Reforma elétrica? Se tiver qualquer dúvida, é só me chamar.",
        "",
        "https://orcai.app/o/abc",
        "",
        "Ana Elétrica",
      ].join("\n"),
    );
  });
});
