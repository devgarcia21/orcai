/** Normaliza para busca: minúsculo e sem acentos ("Conceição" → "conceicao"). */
export function normalizarBusca(texto: string): string {
  // NFD separa a letra do acento; \p{M} remove as marcas de acentuação.
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Confere se algum dos campos contém o termo (sem diferenciar acentos). */
export function correspondeBusca(termo: string, campos: (string | null | undefined)[]) {
  const t = normalizarBusca(termo);
  if (!t) return true;
  return campos.some((campo) => campo && normalizarBusca(campo).includes(t));
}
