import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import type { ItemOrcamento, OrcamentoCompleto } from "@/lib/types/database";

import type { DadosPdfOrcamento } from "./documento-orcamento";
import { gerarPdfOrcamento } from "./gerar-pdf";

const item = (i: number, extra: Partial<ItemOrcamento> = {}): ItemOrcamento => ({
  id: `item-${i}`,
  orcamento_id: "orc-1",
  descricao: `Instalação de tomada 20A com acabamento — cômodo ${i}`,
  quantidade: 2.5,
  unidade: "m2",
  valor_unitario_centavos: 1999,
  ordem: i,
  created_at: "2026-11-23T12:00:00Z",
  ...extra,
});

function exemplo(
  qtdItens: number,
  extra: Partial<OrcamentoCompleto> = {},
): DadosPdfOrcamento {
  return {
    prestador: {
      nome: "João da Silva",
      nome_empresa: "Silva Elétrica & Reformas",
      telefone: "11987654321",
      cidade: "São José dos Campos - SP",
      tipo_chave_pix: "cnpj",
      chave_pix: "11222333000181",
    },
    logo: null,
    orcamento: {
      id: "orc-1",
      prestador_id: "p-1",
      cliente_id: "c-1",
      numero: 7,
      titulo: "Reforma elétrica do apartamento — instalação e manutenção",
      status: "rascunho",
      desconto_centavos: 1000,
      percentual_sinal: 30,
      valido_ate: "2026-12-08",
      condicoes_pagamento: "Sinal de 30% via PIX e o restante na conclusão do serviço.",
      observacoes: "Material incluso. Prazo de execução: 3 dias úteis após a aprovação.",
      created_at: "2026-11-23T12:00:00Z",
      updated_at: "2026-11-23T12:00:00Z",
      cliente: {
        id: "c-1",
        prestador_id: "p-1",
        nome: "Maria da Conceição Araújo",
        telefone: "11912345678",
        email: "maria@exemplo.com",
        endereco: "Rua das Acácias, 123 — Jardim Botânico",
        observacoes: null,
        created_at: "2026-11-23T12:00:00Z",
        updated_at: "2026-11-23T12:00:00Z",
      },
      itens: Array.from({ length: qtdItens }, (_, i) => item(i)),
      ...extra,
    },
  };
}

/** PNG válido de cor sólida, gerado na hora (para testar a logo sem arquivo externo). */
function pngSolido(largura: number, altura: number, [r, g, b]: [number, number, number]) {
  const crcTabela = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTabela[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
    const soma = Buffer.alloc(4);
    soma.writeUInt32BE(crc(corpo));
    return Buffer.concat([tamanho, corpo, soma]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  const linha = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(largura * 3, Buffer.from([r, g, b])),
  ]);
  const pixels = Buffer.concat(Array.from({ length: altura }, () => linha));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(pixels)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

/** Extrai o texto de cada página do PDF (como um leitor de PDF faria). */
async function textosPorPagina(pdf: Buffer): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
  const paginas: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    paginas.push(items.map((i) => ("str" in i ? i.str : "")).join(" "));
  }
  return paginas;
}

describe("gerarPdfOrcamento", () => {
  it("gera um PDF válido e não vazio", async () => {
    const pdf = await gerarPdfOrcamento(exemplo(3));

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.toString("latin1").trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf.length).toBeGreaterThan(5_000);
    const paginas = await textosPorPagina(pdf);
    expect(paginas).toHaveLength(1);
    // Acentos e "ç" saem corretos (fonte com suporte completo)
    expect(paginas[0]).toContain("Conceição");
    expect(paginas[0]).toContain("Elétrica");
    expect(paginas[0]).toContain("execução");
  });

  it("quebra em várias páginas quando há muitos itens", async () => {
    const pdf = await gerarPdfOrcamento(exemplo(60));
    const paginas = await textosPorPagina(pdf);
    expect(paginas.length).toBeGreaterThanOrEqual(3);

    paginas.forEach((texto, i) => {
      // Rodapé em TODAS as páginas (regressão: lineHeight + Inter o fazia sumir)
      expect(texto).toContain(`Página ${i + 1} de ${paginas.length}`);
      expect(texto).toContain("Gerado com Orçaí");
      // Cabeçalho da tabela repetido em cada página com itens
      if (i < paginas.length - 1) expect(texto).toContain("DESCRIÇÃO");
    });

    // Todos os 60 itens aparecem, cada um uma única vez (nenhuma linha cortada/duplicada)
    const tudo = paginas.join(" ");
    for (let i = 0; i < 60; i++) {
      expect(tudo.split(`cômodo ${i} `).length - 1, `item ${i}`).toBe(1);
    }

    // Para inspecionar visualmente: PDF_AMOSTRA=caminho.pdf npm test
    if (process.env.PDF_AMOSTRA) writeFileSync(process.env.PDF_AMOSTRA, pdf);
  });

  it("inclui o QR Code PIX do sinal com o valor e a instrução", async () => {
    // 3 itens de 2,5 × R$ 19,99 = R$ 149,94; − R$ 10,00 = R$ 139,94; sinal 30% = R$ 41,98
    const pdf = await gerarPdfOrcamento({ ...exemplo(3), referenciaPix: "0a1b2c3d" });
    const [pagina] = await textosPorPagina(pdf);
    expect(pagina).toContain("Leia o QR Code no app do seu banco");
    // O extrator de texto separa os pedaços com espaços; comparamos sem eles.
    expect(pagina.replace(/\s+/g, "")).toContain("Sinal(30%):R$41,98");
  });

  it("sem cidade (obrigatória no BR Code), mostra só a chave, sem QR Code", async () => {
    const dados = exemplo(3);
    dados.prestador = { ...dados.prestador, cidade: null };
    const [pagina] = await textosPorPagina(
      await gerarPdfOrcamento({ ...dados, referenciaPix: "0a1b2c3d" }),
    );
    expect(pagina).toContain("Pagamento via PIX");
    expect(pagina).not.toContain("Leia o QR Code");
  });

  it("embute a logo do prestador", async () => {
    const dados = exemplo(2);
    const semLogo = await gerarPdfOrcamento(dados);
    const comLogo = await gerarPdfOrcamento({
      ...dados,
      logo: { data: pngSolido(120, 60, [10, 92, 214]), format: "png" },
      referenciaPix: "0a1b2c3d", // amostra completa: logo + QR Code PIX
    });
    expect(comLogo.toString("latin1")).toContain("/Subtype /Image");
    expect(semLogo.toString("latin1")).not.toContain("/Subtype /Image");

    if (process.env.PDF_AMOSTRA_LOGO)
      writeFileSync(process.env.PDF_AMOSTRA_LOGO, comLogo);
  });

  it("funciona sem desconto, sem sinal, sem PIX e sem textos opcionais", async () => {
    const dados = exemplo(1, {
      desconto_centavos: 0,
      percentual_sinal: 0,
      valido_ate: null,
      condicoes_pagamento: null,
      observacoes: null,
    });
    dados.prestador = {
      ...dados.prestador,
      nome_empresa: null,
      tipo_chave_pix: null,
      chave_pix: null,
    };

    const pdf = await gerarPdfOrcamento(dados);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
