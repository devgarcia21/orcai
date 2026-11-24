import { adicionarDias, dataNoBrasil } from "@/lib/datas";
import {
  calcularResumo,
  valorCobradoNoPix,
  type ItemCalculavel,
} from "@/lib/orcamento/calculos";
import { orcamentoVencido } from "@/lib/orcamento/regras";
import type { Orcamento } from "@/lib/types/database";

import { dentro, ultimosMeses, type Intervalo, type Periodo } from "./periodo";

/**
 * Métricas do painel — módulo PURO: recebe os orçamentos já carregados e as
 * datas de referência e devolve todos os indicadores. Os totais vêm sempre de
 * calculos.ts (nada de total guardado no banco). Datas no fuso de São Paulo.
 */

export type OrcamentoParaMetricas = Pick<
  Orcamento,
  | "id"
  | "numero"
  | "titulo"
  | "status"
  | "created_at"
  | "enviado_em"
  | "visualizado_em"
  | "respondido_em"
  | "sinal_recebido_em"
  | "valido_ate"
  | "desconto_centavos"
  | "percentual_sinal"
  | "token_publico"
> & {
  itens: ItemCalculavel[];
  cliente_nome: string;
  cliente_telefone: string | null;
};

/** Comparação com o período anterior. */
export type Comparacao =
  | { tipo: "variacao"; percentual: number } // +18 / -5 (%)
  | { tipo: "sem_base" } // antes era zero, agora não
  | { tipo: "igual" };

/** Comparação de uma taxa, em pontos percentuais. */
export type ComparacaoTaxa =
  | { tipo: "pontos"; pontos: number }
  | { tipo: "sem_base" } // não havia respostas no período anterior
  | { tipo: "sem_dados" }; // não há respostas no período atual

export type Indicador = {
  valor: number;
  anterior: number;
  comparacao: Comparacao;
  /** Quantos orçamentos formam o valor. */
  quantidade: number;
};

export type IndicadorTaxa = {
  /** 0 a 100 (com casas decimais) ou null quando não houve respostas. */
  valor: number | null;
  anterior: number | null;
  comparacao: ComparacaoTaxa;
  aprovados: number;
  recusados: number;
};

export type EtapaFunil = {
  etapa: "criados" | "enviados" | "visualizados" | "aprovados";
  rotulo: string;
  quantidade: number;
  /** % em relação aos criados; null se não houve orçamentos criados. */
  percentual: number | null;
};

export type ItemAtencao = {
  id: string;
  numero: number;
  titulo: string;
  cliente_nome: string;
  valor: number;
};

export type GrupoAtencao<T> = { itens: T[]; total: number };

export type PainelMetricas = {
  indicadores: {
    valorAprovado: Indicador;
    aReceber: Indicador;
    sinaisRecebidos: Indicador;
    taxaAprovacao: IndicadorTaxa;
    aguardandoResposta: Indicador;
  };
  /** Valor aprovado por mês, nos últimos 6 meses (sempre 6, do mais antigo ao atual). */
  meses: { mes: string; valor: number; quantidade: number }[];
  funil: EtapaFunil[];
  atencao: {
    semResposta: GrupoAtencao<
      ItemAtencao & {
        diasSemResposta: number;
        token_publico: string | null;
        cliente_telefone: string | null;
      }
    >;
    vencendo: GrupoAtencao<ItemAtencao & { valido_ate: string; diasParaVencer: number }>;
    aguardandoSinal: GrupoAtencao<ItemAtencao & { aprovadoEm: string }>;
  };
};

export const MAXIMO_POR_GRUPO = 5;
/** "Enviado há mais de 3 dias sem resposta". */
export const DIAS_SEM_RESPOSTA = 3;
/** "Vence nos próximos 3 dias". */
export const DIAS_PARA_VENCER = 3;

const DIA_MS = 86_400_000;
const data = (timestamp: string | null) => (timestamp ? dataNoBrasil(timestamp) : null);

/** Comparação percentual com o período anterior (tratando o anterior zerado). */
export function comparar(atual: number, anterior: number): Comparacao {
  if (atual === anterior) return { tipo: "igual" };
  if (anterior === 0) return { tipo: "sem_base" };
  return {
    tipo: "variacao",
    percentual: ((atual - anterior) / Math.abs(anterior)) * 100,
  };
}

/** Comparação de taxas em pontos percentuais. */
export function compararTaxa(
  atual: number | null,
  anterior: number | null,
): ComparacaoTaxa {
  if (atual === null) return { tipo: "sem_dados" };
  if (anterior === null) return { tipo: "sem_base" };
  return { tipo: "pontos", pontos: atual - anterior };
}

function total(o: OrcamentoParaMetricas): number {
  return calcularResumo(o.itens, o.desconto_centavos, o.percentual_sinal).total;
}

function valorDoSinal(o: OrcamentoParaMetricas): number {
  return valorCobradoNoPix(
    calcularResumo(o.itens, o.desconto_centavos, o.percentual_sinal),
  );
}

/**
 * Dia da resposta (aprovado/recusado). Orçamentos antigos, de antes de
 * `respondido_em` existir, usam a data de criação.
 */
function dataResposta(o: OrcamentoParaMetricas): string | null {
  if (o.status !== "aprovado" && o.status !== "recusado") return null;
  return data(o.respondido_em ?? o.created_at);
}

const somar = (
  lista: OrcamentoParaMetricas[],
  valor: (o: OrcamentoParaMetricas) => number,
) => lista.reduce((soma, o) => soma + valor(o), 0);

function indicador(
  atuais: OrcamentoParaMetricas[],
  anteriores: OrcamentoParaMetricas[],
  valor: (o: OrcamentoParaMetricas) => number,
): Indicador {
  const v = somar(atuais, valor);
  const a = somar(anteriores, valor);
  return { valor: v, anterior: a, comparacao: comparar(v, a), quantidade: atuais.length };
}

const aprovadosEm = (lista: OrcamentoParaMetricas[], intervalo: Intervalo) =>
  lista.filter((o) => o.status === "aprovado" && dentro(dataResposta(o), intervalo));

const recusadosEm = (lista: OrcamentoParaMetricas[], intervalo: Intervalo) =>
  lista.filter((o) => o.status === "recusado" && dentro(dataResposta(o), intervalo));

/** Taxa de aprovação: aprovados ÷ (aprovados + recusados) respondidos no intervalo. */
function taxa(lista: OrcamentoParaMetricas[], intervalo: Intervalo) {
  const aprovados = aprovadosEm(lista, intervalo).length;
  const recusados = recusadosEm(lista, intervalo).length;
  const respostas = aprovados + recusados;
  return {
    aprovados,
    recusados,
    valor: respostas ? (aprovados / respostas) * 100 : null,
  };
}

/**
 * Saldos "do momento", olhando o passado pelas datas dos eventos.
 * `ate` = último dia que já aconteceu (hoje, ou a véspera do início do período).
 */
function aReceberEm(lista: OrcamentoParaMetricas[], ate: string) {
  return lista.filter((o) => {
    const aprovado = o.status === "aprovado" ? dataResposta(o) : null;
    if (aprovado === null || aprovado > ate) return false;
    const recebido = data(o.sinal_recebido_em);
    return recebido === null || recebido > ate;
  });
}

function aguardandoEm(lista: OrcamentoParaMetricas[], ate: string) {
  return lista.filter((o) => {
    if (o.status === "rascunho") return false;
    // Enviado até essa data (orçamentos sem enviado_em, de antes da Etapa 4, usam a criação)
    const enviado =
      data(o.enviado_em) ?? (o.status === "enviado" ? data(o.created_at) : null);
    if (enviado === null || enviado > ate) return false;
    const respondido = dataResposta(o);
    if (respondido !== null && respondido <= ate) return false;
    // Vencido até lá não conta: o cliente já não pode responder.
    return !orcamentoVencido(o.valido_ate, ate);
  });
}

export function calcularMetricas(
  orcamentos: OrcamentoParaMetricas[],
  { periodo, hoje, agora }: { periodo: Periodo; hoje: string; agora: Date },
): PainelMetricas {
  const { atual, anterior } = periodo;
  const vesperaDoPeriodo = adicionarDias(atual.inicio, -1);

  // ---- Indicadores
  const valorAprovado = indicador(
    aprovadosEm(orcamentos, atual),
    aprovadosEm(orcamentos, anterior),
    total,
  );
  const aReceber = indicador(
    aReceberEm(orcamentos, hoje),
    aReceberEm(orcamentos, vesperaDoPeriodo),
    valorDoSinal,
  );
  const recebidosEm = (intervalo: Intervalo) =>
    orcamentos.filter(
      (o) => o.status === "aprovado" && dentro(data(o.sinal_recebido_em), intervalo),
    );
  const sinaisRecebidos = indicador(
    recebidosEm(atual),
    recebidosEm(anterior),
    valorDoSinal,
  );

  const taxaAtual = taxa(orcamentos, atual);
  const taxaAnterior = taxa(orcamentos, anterior);

  const aguardandoAgora = aguardandoEm(orcamentos, hoje);
  const aguardandoAntes = aguardandoEm(orcamentos, vesperaDoPeriodo);

  // ---- Gráfico: valor aprovado por mês (6 meses, fuso de São Paulo)
  const meses = ultimosMeses(hoje).map((mes) => {
    const doMes = orcamentos.filter(
      (o) => o.status === "aprovado" && dataResposta(o)?.slice(0, 7) === mes,
    );
    return { mes, valor: somar(doMes, total), quantidade: doMes.length };
  });

  // ---- Funil: orçamentos CRIADOS no período e até onde chegaram.
  // Uma resposta (aprovado/recusado) implica que foi enviado e visto — assim o
  // funil nunca "cresce" de uma etapa para a outra.
  const criados = orcamentos.filter((o) => dentro(data(o.created_at), atual));
  const respondido = (o: OrcamentoParaMetricas) =>
    o.status === "aprovado" || o.status === "recusado";
  const contagens = {
    criados: criados.length,
    enviados: criados.filter((o) => o.status !== "rascunho").length,
    visualizados: criados.filter((o) => o.visualizado_em !== null || respondido(o))
      .length,
    aprovados: criados.filter((o) => o.status === "aprovado").length,
  };
  const rotulosFunil = {
    criados: "Criados",
    enviados: "Enviados",
    visualizados: "Visualizados",
    aprovados: "Aprovados",
  } as const;
  const funil: EtapaFunil[] = (Object.keys(rotulosFunil) as EtapaFunil["etapa"][]).map(
    (etapa) => ({
      etapa,
      rotulo: rotulosFunil[etapa],
      quantidade: contagens[etapa],
      percentual: contagens.criados ? (contagens[etapa] / contagens.criados) * 100 : null,
    }),
  );

  // ---- Precisa da sua atenção
  const base = (o: OrcamentoParaMetricas): ItemAtencao => ({
    id: o.id,
    numero: o.numero,
    titulo: o.titulo,
    cliente_nome: o.cliente_nome,
    valor: total(o),
  });
  const grupo = <T>(itens: T[]): GrupoAtencao<T> => ({
    itens: itens.slice(0, MAXIMO_POR_GRUPO),
    total: itens.length,
  });

  const enviadosValidos = orcamentos.filter(
    (o) => o.status === "enviado" && !orcamentoVencido(o.valido_ate, hoje),
  );

  const semResposta = enviadosValidos
    .filter(
      (o) =>
        o.enviado_em !== null &&
        agora.getTime() - new Date(o.enviado_em).getTime() > DIAS_SEM_RESPOSTA * DIA_MS,
    )
    .map((o) => ({
      ...base(o),
      diasSemResposta: Math.floor(
        (agora.getTime() - new Date(o.enviado_em as string).getTime()) / DIA_MS,
      ),
      token_publico: o.token_publico,
      cliente_telefone: o.cliente_telefone,
    }))
    .sort((a, b) => b.diasSemResposta - a.diasSemResposta);

  const limiteVencimento = adicionarDias(hoje, DIAS_PARA_VENCER);
  const vencendo = enviadosValidos
    .filter((o) => o.valido_ate !== null && o.valido_ate <= limiteVencimento)
    .map((o) => {
      const validoAte = o.valido_ate as string;
      const dias = Math.round(
        (Date.parse(`${validoAte}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / DIA_MS,
      );
      return { ...base(o), valido_ate: validoAte, diasParaVencer: dias };
    })
    .sort((a, b) => a.valido_ate.localeCompare(b.valido_ate));

  const aguardandoSinal = aReceberEm(orcamentos, hoje)
    .map((o) => ({
      ...base(o),
      valor: valorDoSinal(o),
      aprovadoEm: dataResposta(o) as string,
    }))
    .sort((a, b) => a.aprovadoEm.localeCompare(b.aprovadoEm));

  return {
    indicadores: {
      valorAprovado,
      aReceber,
      sinaisRecebidos,
      taxaAprovacao: {
        valor: taxaAtual.valor,
        anterior: taxaAnterior.valor,
        comparacao: compararTaxa(taxaAtual.valor, taxaAnterior.valor),
        aprovados: taxaAtual.aprovados,
        recusados: taxaAtual.recusados,
      },
      aguardandoResposta: {
        valor: aguardandoAgora.length,
        anterior: aguardandoAntes.length,
        comparacao: comparar(aguardandoAgora.length, aguardandoAntes.length),
        quantidade: aguardandoAgora.length,
      },
    },
    meses,
    funil,
    atencao: {
      semResposta: grupo(semResposta),
      vencendo: grupo(vencendo),
      aguardandoSinal: grupo(aguardandoSinal),
    },
  };
}
