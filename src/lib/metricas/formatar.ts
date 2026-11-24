import type { Comparacao, ComparacaoTaxa } from "./calcular";

/** Sinal de menos tipográfico (−) para ler bem: "−12%". */
const MENOS = "−";

const comSinal = (n: number, sufixo: string) => {
  const arredondado = Math.round(n);
  if (arredondado === 0) return `0${sufixo}`;
  return `${arredondado > 0 ? "+" : MENOS}${Math.abs(arredondado)}${sufixo}`;
};

/** "+18% vs. 30 dias anteriores" / "Sem variação vs. …" / "Sem base de comparação". */
export function textoComparacao(comparacao: Comparacao, rotulo: string): string {
  switch (comparacao.tipo) {
    case "variacao":
      return `${comSinal(comparacao.percentual, "%")} ${rotulo}`;
    case "igual":
      return `Sem variação ${rotulo}`;
    case "sem_base":
      return `Antes era zero (${rotulo.replace(/^vs\. /, "")})`;
  }
}

/** "+5 p.p. vs. 30 dias anteriores" (pontos percentuais). */
export function textoComparacaoTaxa(comparacao: ComparacaoTaxa, rotulo: string): string {
  switch (comparacao.tipo) {
    case "pontos":
      return `${comSinal(comparacao.pontos, " p.p.")} ${rotulo}`;
    case "sem_base":
      return `Sem respostas no período anterior`;
    case "sem_dados":
      return "Sem respostas no período";
  }
}

/** Direção da mudança, para colorir: subiu, caiu ou ficou igual. */
export function direcao(
  comparacao: Comparacao | ComparacaoTaxa,
): "sobe" | "desce" | "igual" {
  if (comparacao.tipo === "variacao") {
    const n = Math.round(comparacao.percentual);
    return n > 0 ? "sobe" : n < 0 ? "desce" : "igual";
  }
  if (comparacao.tipo === "pontos") {
    const n = Math.round(comparacao.pontos);
    return n > 0 ? "sobe" : n < 0 ? "desce" : "igual";
  }
  return comparacao.tipo === "sem_base" ? "sobe" : "igual";
}

/** 66.666 → "67%"; null → "—". */
export function formatarPercentual(valor: number | null): string {
  return valor === null ? "—" : `${Math.round(valor)}%`;
}

const formatadorMes = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});
const formatadorMesLongo = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11" → "nov" (rótulo curto do gráfico). */
export function rotuloMes(mes: string): string {
  return formatadorMes.format(new Date(`${mes}-15T12:00:00Z`)).replace(".", "");
}

/** "2026-11" → "novembro de 2026" (texto para leitores de tela). */
export function rotuloMesLongo(mes: string): string {
  return formatadorMesLongo.format(new Date(`${mes}-15T12:00:00Z`));
}
