/**
 * Cálculos do orçamento — fonte ÚNICA da verdade, usada na tela (resumo em
 * tempo real) e no servidor (validação ao salvar e totais das listagens).
 *
 * Todas as funções são puras e trabalham com centavos inteiros.
 * Arredondamento: meio para cima (R$ 0,005 → R$ 0,01).
 */

export type ItemCalculavel = {
  quantidade: number;
  valor_unitario_centavos: number;
};

export type ResumoOrcamento = {
  subtotal: number;
  /** Desconto efetivamente aplicado (limitado ao subtotal). */
  desconto: number;
  total: number;
  sinal: number;
  /** Percentual do sinal efetivamente aplicado (0 a 100). */
  percentualSinal: number;
};

const limitar = (valor: number, min: number, max: number) =>
  Math.min(Math.max(valor, min), max);

/**
 * Total da linha: quantidade × valor unitário, arredondado para centavos.
 * A quantidade (até 2 casas) é convertida em centésimos inteiros antes da
 * multiplicação, para evitar erros de ponto flutuante (ex.: 1,15 × 100).
 */
export function totalItem({
  quantidade,
  valor_unitario_centavos,
}: ItemCalculavel): number {
  if (!(quantidade > 0) || !(valor_unitario_centavos > 0)) return 0;
  const centesimos = Math.round(quantidade * 100);
  return Math.round((centesimos * valor_unitario_centavos) / 100);
}

/** Soma dos totais de todas as linhas. */
export function subtotal(itens: ItemCalculavel[]): number {
  return itens.reduce((soma, item) => soma + totalItem(item), 0);
}

/** Desconto aplicado: nunca negativo e nunca maior que o subtotal. */
export function descontoAplicado(
  subtotalCentavos: number,
  descontoCentavos: number,
): number {
  return limitar(Math.round(descontoCentavos) || 0, 0, subtotalCentavos);
}

/** Total final: subtotal menos o desconto aplicado. */
export function totalFinal(subtotalCentavos: number, descontoCentavos: number): number {
  return subtotalCentavos - descontoAplicado(subtotalCentavos, descontoCentavos);
}

/** Valor do sinal: percentual (0 a 100) sobre o total final. */
export function valorSinal(totalCentavos: number, percentual: number): number {
  const p = limitar(Math.round(percentual) || 0, 0, 100);
  return Math.round((totalCentavos * p) / 100);
}

/** Calcula tudo de uma vez. */
export function calcularResumo(
  itens: ItemCalculavel[],
  descontoCentavos: number,
  percentualSinal: number,
): ResumoOrcamento {
  const sub = subtotal(itens);
  const desconto = descontoAplicado(sub, descontoCentavos);
  const total = sub - desconto;
  const percentual = limitar(Math.round(percentualSinal) || 0, 0, 100);
  return {
    subtotal: sub,
    desconto,
    total,
    sinal: valorSinal(total, percentual),
    percentualSinal: percentual,
  };
}

/**
 * Valor cobrado no PIX do orçamento aprovado: o sinal ou, com sinal de 0%, o
 * total. É o que o prestador marca como "Sinal recebido" (PIX e métricas).
 */
export function valorCobradoNoPix(resumo: ResumoOrcamento): number {
  return resumo.percentualSinal > 0 ? resumo.sinal : resumo.total;
}
