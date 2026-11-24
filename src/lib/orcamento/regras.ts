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

/**
 * Vencido: a validade (data, sem hora) já passou. Válido até HOJE ainda vale.
 * `hoje` vem de hojeISO() (fuso do Brasil), igual à regra do banco.
 */
export function orcamentoVencido(validoAte: string | null, hoje: string): boolean {
  return validoAte !== null && validoAte < hoje;
}

/** O cliente só pode aprovar/recusar um orçamento enviado e dentro da validade. */
export function clientePodeResponder(
  orcamento: { status: StatusOrcamento; valido_ate: string | null },
  hoje: string,
): boolean {
  return orcamento.status === "enviado" && !orcamentoVencido(orcamento.valido_ate, hoje);
}

/** O prestador pode enviar (WhatsApp / copiar link) rascunhos e orçamentos já enviados. */
export function podeEnviar(status: StatusOrcamento): boolean {
  return status === "rascunho" || status === "enviado";
}

/**
 * Status mostrado na tela: um orçamento ENVIADO com a validade vencida aparece
 * como "Vencido". É só exibição — o banco continua com "enviado".
 */
export type StatusExibicao = StatusOrcamento | "vencido";

export const ROTULOS_STATUS_EXIBICAO: Record<StatusExibicao, string> = {
  ...ROTULOS_STATUS,
  vencido: "Vencido",
};

export function statusExibicao(
  orcamento: { status: StatusOrcamento; valido_ate: string | null },
  hoje: string,
): StatusExibicao {
  return orcamento.status === "enviado" && orcamentoVencido(orcamento.valido_ate, hoje)
    ? "vencido"
    : orcamento.status;
}
