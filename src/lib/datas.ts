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

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASIL,
  hour: "2-digit",
  minute: "2-digit",
});

/** Timestamp → "23/11/2026 às 14:05" (fuso de São Paulo). */
export function formatarDataHora(timestamp: string): string {
  const data = new Date(timestamp);
  return `${formatadorDataHora.format(data)} às ${formatadorHora.format(data)}`;
}

/** Data ("AAAA-MM-DD") de um timestamp no fuso de São Paulo. */
export function dataNoBrasil(timestamp: string | Date): string {
  return formatadorDiaBrasil.format(new Date(timestamp));
}

/** Diferença, em minutos, entre o horário de São Paulo e o UTC num instante. */
function deslocamentoBrasilMinutos(instante: Date): number {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO_BRASIL,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(instante)
      .map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour),
    Number(partes.minute),
  );
  return Math.round((comoUtc - instante.getTime()) / 60_000);
}

/**
 * Instante (ISO UTC) da meia-noite de uma data em São Paulo.
 * "2026-11-01" → "2026-11-01T03:00:00.000Z". Respeita horário de verão antigo.
 */
export function inicioDoDiaNoBrasil(dataISO: string): string {
  const [, a, m, d] = DATA_ISO.exec(dataISO) ?? [];
  if (!a) throw new Error(`Data inválida: ${dataISO}`);
  const meiaNoiteUtc = Date.UTC(Number(a), Number(m) - 1, Number(d));
  // Duas passadas: o deslocamento pode mudar perto da meia-noite.
  let instante =
    meiaNoiteUtc - deslocamentoBrasilMinutos(new Date(meiaNoiteUtc)) * 60_000;
  instante = meiaNoiteUtc - deslocamentoBrasilMinutos(new Date(instante)) * 60_000;
  return new Date(instante).toISOString();
}
