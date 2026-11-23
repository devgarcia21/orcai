/**
 * Datas no padrão brasileiro.
 *
 * Datas "puras" (coluna date, ex.: validade) circulam como "AAAA-MM-DD" e são
 * manipuladas sem fuso horário, para nunca "voltarem um dia" na conversão.
 * Timestamps (created_at) são exibidos no fuso de São Paulo.
 */

export const FUSO_BRASIL = "America/Sao_Paulo";

const formatadorDiaBrasil = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_BRASIL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASIL,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data de hoje no Brasil, em "AAAA-MM-DD". */
export function hojeISO(agora: Date = new Date()): string {
  return formatadorDiaBrasil.format(agora);
}

/** Soma (ou subtrai) dias de uma data "AAAA-MM-DD". */
export function adicionarDias(dataISO: string, dias: number): string {
  const [, a, m, d] = DATA_ISO.exec(dataISO) ?? [];
  if (!a) throw new Error(`Data inválida: ${dataISO}`);
  const data = new Date(Date.UTC(Number(a), Number(m) - 1, Number(d) + dias));
  return data.toISOString().slice(0, 10);
}

/** Confere se é uma data real no formato "AAAA-MM-DD" (rejeita 2026-02-30). */
export function dataISOValida(texto: string): boolean {
  const partes = DATA_ISO.exec(texto);
  if (!partes) return false;
  const [, a, m, d] = partes.map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return (
    data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d
  );
}

/** "2026-11-23" → "23/11/2026". Também aceita timestamps ISO completos. */
export function formatarData(valor: string): string {
  const partes = DATA_ISO.exec(valor);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  return formatadorDataHora.format(new Date(valor));
}
