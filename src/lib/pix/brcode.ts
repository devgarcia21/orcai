import type { TipoChavePix } from "@/lib/types/database";

import { normalizarChavePix } from "./chave";

/**
 * Gerador do "PIX Copia e Cola" ESTÁTICO (BR Code), conforme o Manual de
 * Padrões para Iniciação do Pix (Banco Central) — formato EMV® QRCPS-MPM:
 * uma sequência de campos TLV "ID (2) + tamanho (2) + valor".
 *
 * Módulo puro: sem rede, sem banco. Testado em brcode.test.ts.
 */

// IDs dos campos (EMV / Manual do Pix)
const ID = {
  formato: "00", // Payload Format Indicator = "01"
  contaRecebedor: "26", // Merchant Account Information (Pix)
  gui: "00", //   └ GUI = "br.gov.bcb.pix"
  chave: "01", //   └ chave Pix
  categoria: "52", // Merchant Category Code = "0000"
  moeda: "53", // Transaction Currency = "986" (Real)
  valor: "54", // Transaction Amount (opcional) = "120.00"
  pais: "58", // Country Code = "BR"
  nome: "59", // Merchant Name (até 25)
  cidade: "60", // Merchant City (até 15)
  adicional: "62", // Additional Data Field Template
  txid: "05", //   └ Reference Label (txid)
  crc: "63", // CRC16
} as const;

export const GUI_PIX = "br.gov.bcb.pix";
export const NOME_MAXIMO = 25;
export const CIDADE_MAXIMO = 15;
export const TXID_MAXIMO = 25;

/** Campo TLV: ID + tamanho com 2 dígitos + valor. */
function campo(id: string, valor: string): string {
  if (valor.length > 99) throw new Error(`Campo ${id} longo demais (${valor.length})`);
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/**
 * CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF, sem reflexão, sem XOR
 * final — a variante "CCITT-FALSE"), em hexadecimal maiúsculo com 4 dígitos.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Texto aceito pelos apps de banco nos campos nome/cidade: sem acentos, só
 * letras, números e espaço (outros símbolos viram espaço), cortado no limite.
 */
export function limparTexto(texto: string, maximo: number): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo)
    .trim();
}

/** Centavos → "120.00" (ponto como separador, 2 casas, sem milhar). */
export function formatarValorPix(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

/**
 * txid do orçamento: "ORC" + número com 4 dígitos + referência aleatória
 * (trecho do id). Só letras e números, até 25 caracteres. Estável: o mesmo
 * orçamento gera sempre o mesmo QR Code.
 */
export function txidOrcamento(numero: number, referencia: string): string {
  const ref = referencia.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `ORC${String(numero).padStart(4, "0")}${ref}`.slice(0, TXID_MAXIMO);
}

export type DadosBrCode = {
  tipoChave: TipoChavePix;
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  /** Valor em centavos; 0 ou ausente = o pagador digita o valor. */
  valorCentavos?: number;
  /** Identificador da cobrança; "***" quando não informado. */
  txid?: string;
};

export type ResultadoBrCode = { ok: true; payload: string } | { ok: false; erro: string };

/** Monta o payload "PIX Copia e Cola". Erros de dados voltam em `erro`. */
export function gerarBrCode(dados: DadosBrCode): ResultadoBrCode {
  const chave = normalizarChavePix(dados.tipoChave, dados.chave);
  if (!chave.ok) return { ok: false, erro: `Chave PIX inválida: ${chave.erro}` };

  const nome = limparTexto(dados.nomeRecebedor, NOME_MAXIMO);
  if (!nome) return { ok: false, erro: "Informe o nome de quem recebe o PIX." };

  const cidade = limparTexto(dados.cidade, CIDADE_MAXIMO);
  if (!cidade) {
    return {
      ok: false,
      erro: "Informe a cidade no seu perfil: ela é obrigatória no QR Code PIX.",
    };
  }

  const valor = dados.valorCentavos ?? 0;
  if (!Number.isInteger(valor) || valor < 0)
    return { ok: false, erro: "Valor inválido." };

  const txid = dados.txid ?? "***";
  if (txid !== "***" && !/^[A-Za-z0-9]{1,25}$/.test(txid)) {
    return {
      ok: false,
      erro: "O identificador (txid) deve ter até 25 letras e números.",
    };
  }

  const semCrc =
    campo(ID.formato, "01") +
    campo(ID.contaRecebedor, campo(ID.gui, GUI_PIX) + campo(ID.chave, chave.chave)) +
    campo(ID.categoria, "0000") +
    campo(ID.moeda, "986") +
    (valor > 0 ? campo(ID.valor, formatarValorPix(valor)) : "") +
    campo(ID.pais, "BR") +
    campo(ID.nome, nome) +
    campo(ID.cidade, cidade) +
    campo(ID.adicional, campo(ID.txid, txid)) +
    `${ID.crc}04`; // o CRC é calculado incluindo o próprio "6304"

  return { ok: true, payload: semCrc + crc16(semCrc) };
}

/** Lê um payload TLV em campos (usado nos testes e para conferência). */
export function lerTlv(payload: string): Record<string, string> {
  const campos: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const tamanho = Number(payload.slice(i + 2, i + 4));
    campos[id] = payload.slice(i + 4, i + 4 + tamanho);
    i += 4 + tamanho;
  }
  return campos;
}
