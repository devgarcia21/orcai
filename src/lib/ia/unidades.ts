import { normalizarBusca } from "@/lib/busca";
import { UNIDADES_ITEM, type UnidadeItem } from "@/lib/types/database";

/**
 * Sinônimos que a IA (ou um item antigo) pode usar, mapeados para as
 * unidades que o Orçaí aceita. Chaves já normalizadas (minúsculas, sem acento).
 */
const SINONIMOS: Record<string, UnidadeItem> = {
  un: "un",
  und: "un",
  unid: "un",
  unidade: "un",
  unidades: "un",
  pc: "un",
  pca: "un",
  peca: "un",
  pecas: "un",
  ponto: "un",
  pontos: "un",
  m: "m",
  mt: "m",
  mts: "m",
  ml: "m",
  metro: "m",
  metros: "m",
  "metro linear": "m",
  "metros lineares": "m",
  m2: "m2",
  "metro quadrado": "m2",
  "metros quadrados": "m2",
  m3: "m3",
  "metro cubico": "m3",
  "metros cubicos": "m3",
  h: "h",
  hr: "h",
  hrs: "h",
  hora: "h",
  horas: "h",
  dia: "dia",
  dias: "dia",
  diaria: "dia",
  diarias: "dia",
  servico: "servico",
  servicos: "servico",
  vb: "servico",
  verba: "servico",
  global: "servico",
  empreitada: "servico",
};

/**
 * Converte o texto de uma unidade numa unidade válida do Orçaí, ou `null`
 * se não reconhecer. "m²" → "m2", "Metros" → "m", "Serviço" → "servico".
 */
export function normalizarUnidade(texto: unknown): UnidadeItem | null {
  if (typeof texto !== "string") return null;
  const limpo = normalizarBusca(texto)
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ");
  if ((UNIDADES_ITEM as readonly string[]).includes(limpo)) return limpo as UnidadeItem;
  return SINONIMOS[limpo] ?? null;
}
