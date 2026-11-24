/**
 * Valores em dinheiro escritos pelo prestador no texto do pedido.
 * Serve de "prova": um preço que a IA diz ter lido só é aceito se o número
 * realmente aparece no texto — assim ela não consegue inventar preço.
 */

// 1.500 | 1.500,50 | 150,5 | 150.50 | 150 — com "mil" opcional depois.
const NUMERO =
  /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+\.\d{1,2}(?!\d)|\d+)(\s*mil\b)?/gi;

/** Converte um número escrito ("1.500,50", "150.5", "2") em centavos. */
function paraCentavos(numero: string): number {
  let normalizado: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(numero)) {
    normalizado = numero.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = numero.replace(",", ".");
  }
  const [inteiro, decimal = ""] = normalizado.split(".");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

/**
 * Todos os valores (em centavos) que aparecem no texto. Pega também números
 * que não são preço (quantidades, metros): a IA diz QUAL é o preço; aqui só
 * conferimos que ele foi escrito pelo prestador.
 * "3 tomadas a R$ 20,50 cada e 1,5 mil de material" → {300, 2050, 150000}
 */
export function valoresNoTexto(texto: string): Set<number> {
  const valores = new Set<number>();
  for (const [, numero, mil] of texto.matchAll(NUMERO)) {
    const centavos = paraCentavos(numero);
    valores.add(mil ? centavos * 1000 : centavos);
  }
  return valores;
}
