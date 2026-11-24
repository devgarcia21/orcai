import { describe, expect, it } from "vitest";

import { nomeArquivoPdf, paraSlug } from "./nome-arquivo";

describe("nomeArquivoPdf", () => {
  it("usa o número com 4 dígitos e o nome do cliente sem acentos", () => {
    expect(nomeArquivoPdf(1, "Maria Souza")).toBe("orcamento-0001-maria-souza.pdf");
    expect(nomeArquivoPdf(42, "João da Conceição")).toBe(
      "orcamento-0042-joao-da-conceicao.pdf",
    );
  });

  it("remove símbolos, espaços extras e pontuação", () => {
    expect(nomeArquivoPdf(7, "  Oficina   do Zé & Filhos Ltda.  ")).toBe(
      "orcamento-0007-oficina-do-ze-filhos-ltda.pdf",
    );
    expect(nomeArquivoPdf(3, "Ação/Construções (SP)")).toBe(
      "orcamento-0003-acao-construcoes-sp.pdf",
    );
  });

  it("não corta números acima de 9999", () => {
    expect(nomeArquivoPdf(12345, "Ana")).toBe("orcamento-12345-ana.pdf");
  });

  it("usa 'cliente' quando o nome não tem letras nem números", () => {
    expect(nomeArquivoPdf(1, "!!!")).toBe("orcamento-0001-cliente.pdf");
    expect(nomeArquivoPdf(1, "")).toBe("orcamento-0001-cliente.pdf");
  });

  it("limita nomes muito longos sem deixar hífen no fim", () => {
    const nome = nomeArquivoPdf(
      1,
      "Construtora e Incorporadora Horizonte Azul do Brasil",
    );
    const slug = nome.replace(/^orcamento-0001-/, "").replace(/\.pdf$/, "");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("paraSlug", () => {
  it("só gera letras minúsculas, números e hífens", () => {
    expect(paraSlug("Çãõ Éí 123")).toBe("cao-ei-123");
    expect(paraSlug("ÁGUA-Ñ")).toBe("agua-n");
  });
});
