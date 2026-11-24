import { numeroComZeros } from "@/lib/orcamento/regras";

const TAMANHO_MAXIMO_NOME = 40;

/** "Maria da Conceição!" → "maria-da-conceicao" (sem acentos, espaços ou símbolos). */
export function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TAMANHO_MAXIMO_NOME)
    .replace(/-+$/g, "");
}

/** Nome do arquivo do PDF: orcamento-0001-maria-souza.pdf */
export function nomeArquivoPdf(numero: number, nomeCliente: string): string {
  const cliente = paraSlug(nomeCliente) || "cliente";
  return `orcamento-${numeroComZeros(numero)}-${cliente}.pdf`;
}
