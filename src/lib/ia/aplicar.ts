type ItemBasico = { descricao: string; valor_unitario_centavos: number };

/** Linha ainda em branco no formulário (sem descrição e sem valor). */
export function itemEmBranco(item: ItemBasico): boolean {
  return item.descricao.trim() === "" && item.valor_unitario_centavos === 0;
}

/**
 * Acrescenta os itens sugeridos aos do formulário, SEM apagar os existentes.
 * Só as linhas em branco somem (ex.: o "Item 1" vazio de um orçamento novo),
 * senão o orçamento ficaria com uma linha vazia que impede salvar.
 * Respeita o máximo de itens do orçamento; o que não couber volta em `cortados`.
 */
export function juntarItens<T extends ItemBasico>(
  atuais: T[],
  novos: T[],
  maximo: number,
): { itens: T[]; adicionados: number; cortados: number } {
  const mantidos = atuais.filter((item) => !itemEmBranco(item));
  const vagas = Math.max(0, maximo - mantidos.length);
  const entram = novos.slice(0, vagas);
  return {
    itens: [...mantidos, ...entram],
    adicionados: entram.length,
    cortados: novos.length - entram.length,
  };
}
