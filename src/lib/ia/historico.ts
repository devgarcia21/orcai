import { normalizarBusca } from "@/lib/busca";
import type { UnidadeItem } from "@/lib/types/database";

/** Item já usado pelo prestador num orçamento anterior (referência de preço). */
export type ItemHistorico = {
  descricao: string;
  unidade: UnidadeItem;
  valor_unitario_centavos: number;
};

/** Quantos itens do histórico vão junto para a IA, no máximo. */
export const LIMITE_HISTORICO = 50;

/** Palavras que não ajudam a identificar um item. */
const PALAVRAS_VAZIAS = new Set([
  "com",
  "sem",
  "para",
  "pra",
  "por",
  "uma",
  "uns",
  "umas",
  "das",
  "dos",
  "nas",
  "nos",
  "que",
  "and",
  "mais",
  "tipo",
  "cada",
]);

/**
 * Palavras significativas de um texto: minúsculas, sem acento, com 3+ letras,
 * no singular simples ("tomadas" → "tomada"). Usado para comparar descrições.
 */
export function palavrasChave(texto: string): Set<string> {
  const palavras = normalizarBusca(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p))
    .map((p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p));
  return new Set(palavras);
}

/** Quantas palavras significativas os dois textos têm em comum. */
export function palavrasEmComum(a: string, b: string): number {
  const pa = palavrasChave(a);
  let total = 0;
  for (const p of palavrasChave(b)) if (pa.has(p)) total++;
  return total;
}

/**
 * Escolhe até `limite` itens do histórico para mandar como referência de preço:
 *
 * 1. ignora itens sem valor (R$ 0,00) ou sem descrição;
 * 2. remove repetidos (mesma descrição sem acento + mesma unidade), ficando
 *    com o MAIS RECENTE — o preço atual do prestador;
 * 3. prioriza os que têm palavras em comum com o texto do pedido;
 *    no empate, os mais recentes primeiro.
 *
 * @param itens itens do prestador, do orçamento mais recente para o mais antigo.
 */
export function selecionarHistorico(
  itens: ItemHistorico[],
  texto: string,
  limite: number = LIMITE_HISTORICO,
): ItemHistorico[] {
  const vistos = new Set<string>();
  const unicos: ItemHistorico[] = [];

  for (const item of itens) {
    const descricao = item.descricao.trim().replace(/\s+/g, " ");
    if (!descricao || !(item.valor_unitario_centavos > 0)) continue;
    const chave = `${normalizarBusca(descricao)}|${item.unidade}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push({ ...item, descricao });
  }

  const palavrasDoTexto = palavrasChave(texto);
  const pontuados = unicos.map((item, recencia) => {
    let pontos = 0;
    for (const p of palavrasChave(item.descricao)) if (palavrasDoTexto.has(p)) pontos++;
    return { item, pontos, recencia };
  });
  pontuados.sort((a, b) => b.pontos - a.pontos || a.recencia - b.recencia);

  return pontuados.slice(0, Math.max(0, limite)).map((p) => p.item);
}
