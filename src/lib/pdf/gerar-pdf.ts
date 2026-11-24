import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import {
  DocumentoOrcamento,
  type DadosPdfOrcamento,
  type LogoPdf,
} from "./documento-orcamento";

/** Renderiza o PDF do orçamento em memória. */
export function gerarPdfOrcamento(dados: DadosPdfOrcamento): Promise<Buffer> {
  // DocumentoOrcamento devolve um <Document>; o tipo do renderToBuffer exige isso
  // explicitamente, mas não consegue inferir através do componente.
  const documento = createElement(
    DocumentoOrcamento,
    dados,
  ) as ReactElement<DocumentProps>;
  return renderToBuffer(documento);
}

const LOGO_TAMANHO_MAXIMO = 3 * 1024 * 1024;
const LOGO_TEMPO_LIMITE_MS = 5000;

/**
 * Baixa a logo para embutir no PDF. Qualquer falha (rede, formato, tamanho)
 * devolve null: o PDF sai sem logo, só com o nome — nunca quebra por isso.
 */
export async function baixarLogo(url: string | null): Promise<LogoPdf | null> {
  if (!url) return null;
  try {
    const resposta = await fetch(url, {
      signal: AbortSignal.timeout(LOGO_TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return null;

    const tipo = resposta.headers.get("content-type") ?? "";
    const format = tipo.includes("png") ? "png" : tipo.includes("jpeg") ? "jpg" : null;
    if (!format) return null;

    const data = Buffer.from(await resposta.arrayBuffer());
    if (data.length === 0 || data.length > LOGO_TAMANHO_MAXIMO) return null;
    return { data, format };
  } catch {
    return null;
  }
}
