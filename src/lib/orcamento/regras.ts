import type { StatusOrcamento, UnidadeItem } from "@/lib/types/database";

/** Quantos dias a validade padrão de um orçamento novo. */
export const VALIDADE_PADRAO_DIAS = 15;
export const MAXIMO_ITENS = 100;

export const ROTULOS_UNIDADE: Record<UnidadeItem, { curto: string; longo: string }> = {
  un: { curto: "un", longo: "Unidade" },
  m: { curto: "m", longo: "Metro" },
  m2: { curto: "m²", longo: "Metro quadrado" },
  m3: { curto: "m³", longo: "Metro cúbico" },
  h: { curto: "h", longo: "Hora" },
  dia: { curto: "dia", longo: "Dia" },
  servico: { curto: "serviço", longo: "Serviço" },
};

export const ROTULOS_STATUS: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

/** Aprovados e recusados ficam congelados: só podem ser duplicados ou excluídos. */
export function orcamentoEditavel(status: StatusOrcamento): boolean {
  return status === "rascunho" || status === "enviado";
}

/** Para quais status um orçamento pode ir a partir do status atual. */
export function proximosStatus(atual: StatusOrcamento): StatusOrcamento[] {
  switch (atual) {
    case "rascunho":
      return ["enviado", "aprovado", "recusado"];
    case "enviado":
      return ["aprovado", "recusado"];
    default:
      return [];
  }
}

/** 7 → "#0007" */
export function formatarNumeroOrcamento(numero: number): string {
  return `#${numeroComZeros(numero)}`;
}

/** 7 → "0007" (usado no PDF e no nome do arquivo) */
export function numeroComZeros(numero: number): string {
  return String(numero).padStart(4, "0");
}
