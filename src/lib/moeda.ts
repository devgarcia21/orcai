/**
 * Dinheiro e números no padrão brasileiro.
 *
 * Regra de ouro: valores em dinheiro circulam como CENTAVOS (inteiros).
 * A conversão para texto só acontece na borda (tela), e a leitura de texto
 * é feita por manipulação de string — sem float — para não perder centavos.
 */

/** Maior valor aceito em um campo de dinheiro: R$ 1.000.000,00. */
export const MOEDA_MAXIMA_CENTAVOS = 100_000_000;

const formatadorReais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 123456 → "R$ 1.234,56" (com espaço comum, não o espaço especial do Intl). */
export function formatarMoeda(centavos: number): string {
  return formatadorReais.format(centavos / 100).replace(/ /g, " ");
}

/**
 * Lê um valor digitado em reais e devolve centavos, ou null se for inválido.
 * Aceita "R$ 1.234,56", "1234,56", "1.234", "12,5", "0,99".
 * Ponto é separador de milhar; vírgula separa os centavos.
 * Mais de 2 casas decimais são arredondadas (meio para cima).
 */
export function lerMoeda(texto: string): number | null {
  const limpo = texto.replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, "");
  if (limpo === "") return null;

  const negativo = limpo.startsWith("-");
  const semSinal = negativo ? limpo.slice(1) : limpo;
  const partes = semSinal.split(",");
  if (partes.length > 2) return null;

  const [inteiro, fracao = ""] = partes;
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(fracao) || inteiro + fracao === "") {
    return null;
  }

  let centavos = Number(inteiro || "0") * 100 + Number(fracao.slice(0, 2).padEnd(2, "0"));
  if (fracao.length > 2 && Number(fracao[2]) >= 5) centavos += 1;
  return negativo ? -centavos : centavos;
}

/**
 * Máscara "de caixa registradora" para inputs de dinheiro: cada dígito
 * digitado entra pela direita. "1" → R$ 0,01; "1234" → R$ 12,34.
 * Devolve os centavos correspondentes ao texto do input.
 */
export function centavosDaMascara(texto: string): number {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (digitos === "") return 0;
  return Math.min(Number(digitos.slice(0, 12)), MOEDA_MAXIMA_CENTAVOS);
}

// --- Quantidades (até 2 casas decimais, vírgula como separador) -----------------

/** Maior quantidade aceita em um item. */
export const QUANTIDADE_MAXIMA = 100_000;

/**
 * Lê uma quantidade digitada ("2,5", "10", "1.000,25") e devolve o número,
 * ou null se for inválida ou tiver mais de 2 casas decimais.
 */
export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "");
  let normalizado: string;

  if (limpo.includes(",")) {
    // Padrão brasileiro: ponto é milhar, vírgula é decimal ("1.000,25").
    const [inteiro, ...resto] = limpo.split(",");
    if (resto.length !== 1 || !/^(\d{1,3}(\.\d{3})+|\d+)$/.test(inteiro)) return null;
    normalizado = `${inteiro.replace(/\./g, "")}.${resto[0]}`;
  } else if (/^\d+\.\d{1,2}$/.test(limpo)) {
    // Teclados que usam ponto como decimal: "2.5".
    normalizado = limpo;
  } else if (/^(\d{1,3}(\.\d{3})+|\d+)$/.test(limpo)) {
    // Inteiro, com ou sem milhar: "10", "1.000".
    normalizado = limpo.replace(/\./g, "");
  } else {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Number(normalizado);
}

/** 2.5 → "2,5"; 1000 → "1.000"; 0.75 → "0,75". */
export function formatarQuantidade(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
}

/** Converte o valor salvo no banco (numeric pode vir como string) em number. */
export function numeroDoBanco(valor: number | string): number {
  return typeof valor === "number" ? valor : Number(valor);
}
