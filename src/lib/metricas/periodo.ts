import { adicionarDias } from "@/lib/datas";

/**
 * Períodos do painel. Todas as datas são "AAAA-MM-DD" no fuso de São Paulo
 * (hoje vem de hojeISO()) e os intervalos são INCLUSIVOS nas duas pontas.
 */
export const PERIODOS = ["7d", "30d", "90d", "mes"] as const;
export type ChavePeriodo = (typeof PERIODOS)[number];
export const PERIODO_PADRAO: ChavePeriodo = "30d";

export const ROTULOS_PERIODO: Record<ChavePeriodo, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  mes: "Este mês",
};

/** Rótulos curtos para o filtro no celular. */
export const ROTULOS_PERIODO_CURTOS: Record<ChavePeriodo, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  mes: "Este mês",
};

/** Lê `?periodo=` da URL; qualquer valor desconhecido vira o padrão (30 dias). */
export function lerPeriodo(valor: unknown): ChavePeriodo {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (PERIODOS as readonly unknown[]).includes(texto)
    ? (texto as ChavePeriodo)
    : PERIODO_PADRAO;
}

export type Intervalo = { inicio: string; fim: string };

export type Periodo = {
  chave: ChavePeriodo;
  rotulo: string;
  atual: Intervalo;
  anterior: Intervalo;
  /** "vs. 30 dias anteriores" — para indicadores do período (somas, taxas). */
  rotuloComparacao: string;
  /** "vs. 30 dias atrás" — para saldos do momento (a receber, aguardando). */
  rotuloComparacaoSaldo: string;
};

const DIAS: Record<Exclude<ChavePeriodo, "mes">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Último dia do mês de uma data "AAAA-MM-DD" (1 a 31). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Primeiro dia do mês, `deslocamento` meses antes/depois: ("2026-03-15", -1) → "2026-02-01". */
export function inicioDoMes(dataISO: string, deslocamento = 0): string {
  const [a, m] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1 + deslocamento, 1));
  return data.toISOString().slice(0, 10);
}

/**
 * Intervalo do período e do período anterior, do mesmo tamanho:
 * - 7/30/90 dias: os N dias terminando hoje (inclusive) e os N dias antes deles;
 * - "Este mês": do dia 1 até hoje, comparado com o mesmo trecho do mês passado
 *   (dia 1 até o mesmo dia, limitado ao fim do mês: 31/03 → 28/02).
 */
export function calcularPeriodo(chave: ChavePeriodo, hoje: string): Periodo {
  if (chave === "mes") {
    const inicio = inicioDoMes(hoje);
    const inicioAnterior = inicioDoMes(hoje, -1);
    const [a, m] = inicioAnterior.split("-").map(Number);
    const dia = Math.min(Number(hoje.slice(8, 10)), ultimoDiaDoMes(a, m));
    return {
      chave,
      rotulo: ROTULOS_PERIODO.mes,
      atual: { inicio, fim: hoje },
      anterior: { inicio: inicioAnterior, fim: adicionarDias(inicioAnterior, dia - 1) },
      rotuloComparacao: "vs. mesmo período do mês passado",
      rotuloComparacaoSaldo: "vs. início do mês",
    };
  }

  const dias = DIAS[chave];
  const inicio = adicionarDias(hoje, -(dias - 1));
  return {
    chave,
    rotulo: ROTULOS_PERIODO[chave],
    atual: { inicio, fim: hoje },
    anterior: { inicio: adicionarDias(inicio, -dias), fim: adicionarDias(inicio, -1) },
    rotuloComparacao: `vs. ${dias} dias anteriores`,
    rotuloComparacaoSaldo: `vs. ${dias} dias atrás`,
  };
}

/** Os últimos `quantidade` meses ("AAAA-MM"), do mais antigo ao atual. */
export function ultimosMeses(hoje: string, quantidade = 6): string[] {
  return Array.from({ length: quantidade }, (_, i) =>
    inicioDoMes(hoje, i - (quantidade - 1)).slice(0, 7),
  );
}

/** Data mais antiga de que o painel precisa (período anterior e gráfico de 6 meses). */
export function dataMaisAntigaNecessaria(periodo: Periodo, hoje: string): string {
  const inicioGrafico = `${ultimosMeses(hoje)[0]}-01`;
  return periodo.anterior.inicio < inicioGrafico
    ? periodo.anterior.inicio
    : inicioGrafico;
}

export const dentro = (data: string | null, intervalo: Intervalo) =>
  data !== null && data >= intervalo.inicio && data <= intervalo.fim;
