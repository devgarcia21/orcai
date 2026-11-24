import { describe, expect, it } from "vitest";

import {
  calcularMetricas,
  comparar,
  compararTaxa,
  MAXIMO_POR_GRUPO,
  type OrcamentoParaMetricas,
} from "./calcular";
import { calcularPeriodo } from "./periodo";

const HOJE = "2026-11-24";
// 12:00 em São Paulo
const AGORA = new Date("2026-11-24T15:00:00Z");
// 30 dias: atual 26/10 a 24/11; anterior 26/09 a 25/10
const PERIODO = calcularPeriodo("30d", HOJE);

let seq = 0;
/** Orçamento de teste: total = valor (1 item), sem desconto, sinal de 30%. */
function orc(extra: Partial<OrcamentoParaMetricas> & { valor?: number } = {}) {
  const { valor = 100_000, ...resto } = extra;
  seq++;
  return {
    id: `id-${seq}`,
    numero: seq,
    titulo: `Orçamento ${seq}`,
    status: "rascunho",
    created_at: "2026-11-10T12:00:00Z",
    enviado_em: null,
    visualizado_em: null,
    respondido_em: null,
    sinal_recebido_em: null,
    valido_ate: null,
    desconto_centavos: 0,
    percentual_sinal: 30,
    token_publico: null,
    itens: [{ quantidade: 1, valor_unitario_centavos: valor }],
    cliente_nome: "Maria",
    cliente_telefone: "11912345678",
    ...resto,
  } satisfies OrcamentoParaMetricas;
}

const aprovado = (respondido: string, extra: Parameters<typeof orc>[0] = {}) =>
  orc({
    status: "aprovado",
    created_at: "2026-09-01T12:00:00Z",
    enviado_em: "2026-09-01T12:00:00Z",
    respondido_em: respondido,
    ...extra,
  });

const metricas = (
  lista: OrcamentoParaMetricas[],
  periodo = PERIODO,
  hoje = HOJE,
  agora = AGORA,
) => calcularMetricas(lista, { periodo, hoje, agora });

describe("comparar (vs. período anterior)", () => {
  it("variação percentual", () => {
    expect(comparar(150, 100)).toEqual({ tipo: "variacao", percentual: 50 });
    expect(comparar(50, 100)).toEqual({ tipo: "variacao", percentual: -50 });
  });
  it("período anterior zerado: sem base de comparação (nunca divide por zero)", () => {
    expect(comparar(100, 0)).toEqual({ tipo: "sem_base" });
    expect(comparar(0, 0)).toEqual({ tipo: "igual" });
    expect(comparar(0, 100)).toEqual({ tipo: "variacao", percentual: -100 });
  });
  it("taxa: pontos percentuais; sem respostas → sem dados / sem base", () => {
    expect(compararTaxa(60, 50)).toEqual({ tipo: "pontos", pontos: 10 });
    expect(compararTaxa(null, 50)).toEqual({ tipo: "sem_dados" });
    expect(compararTaxa(70, null)).toEqual({ tipo: "sem_base" });
  });
});

describe("valor aprovado no período", () => {
  it("soma os totais (via calculos.ts) dos aprovados no período e no anterior", () => {
    const m = metricas([
      aprovado("2026-11-20T12:00:00Z", { valor: 100_000 }),
      aprovado("2026-10-26T12:00:00Z", { valor: 50_000, desconto_centavos: 10_000 }), // total 40.000
      aprovado("2026-10-20T12:00:00Z", { valor: 70_000 }), // anterior
      aprovado("2026-08-01T12:00:00Z", { valor: 999_999 }), // fora dos dois
      orc({ status: "recusado", respondido_em: "2026-11-20T12:00:00Z" }),
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z" }),
    ]);
    expect(m.indicadores.valorAprovado).toEqual({
      valor: 140_000,
      anterior: 70_000,
      quantidade: 2,
      comparacao: { tipo: "variacao", percentual: 100 },
    });
  });

  it("usa o dia da resposta em São Paulo (01:00 UTC do dia 26 ainda é dia 25)", () => {
    const m = metricas([aprovado("2026-10-26T01:00:00Z")]);
    expect(m.indicadores.valorAprovado.valor).toBe(0);
    expect(m.indicadores.valorAprovado.anterior).toBe(100_000);
  });

  it("aprovado antigo, sem respondido_em, usa a data de criação", () => {
    const m = metricas([
      orc({
        status: "aprovado",
        created_at: "2026-11-01T12:00:00Z",
        respondido_em: null,
      }),
    ]);
    expect(m.indicadores.valorAprovado.valor).toBe(100_000);
  });
});

describe("a receber (sinais de aprovados ainda não recebidos)", () => {
  it("soma o valor do sinal dos aprovados sem sinal recebido, de qualquer data", () => {
    const m = metricas([
      aprovado("2026-11-20T12:00:00Z", { valor: 100_000 }), // sinal 30.000
      aprovado("2025-01-10T12:00:00Z", { valor: 50_000, percentual_sinal: 50 }), // 25.000
      aprovado("2026-11-21T12:00:00Z", { sinal_recebido_em: "2026-11-22T12:00:00Z" }),
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z" }),
    ]);
    expect(m.indicadores.aReceber.valor).toBe(55_000);
    expect(m.indicadores.aReceber.quantidade).toBe(2);
  });

  it("com sinal de 0%, o valor a receber é o total (mesma regra do PIX)", () => {
    const m = metricas([aprovado("2026-11-20T12:00:00Z", { percentual_sinal: 0 })]);
    expect(m.indicadores.aReceber.valor).toBe(100_000);
  });

  it("compara com o saldo da véspera do período", () => {
    const m = metricas([
      // aprovado antes do período e recebido dentro dele: estava a receber na véspera
      aprovado("2026-10-10T12:00:00Z", { sinal_recebido_em: "2026-11-01T12:00:00Z" }),
      // aprovado dentro do período, ainda a receber
      aprovado("2026-11-05T12:00:00Z", { valor: 200_000 }),
    ]);
    expect(m.indicadores.aReceber).toMatchObject({ valor: 60_000, anterior: 30_000 });
  });
});

describe("sinais recebidos no período", () => {
  it("soma os sinais marcados como recebidos no período e no anterior", () => {
    const m = metricas([
      aprovado("2026-10-01T12:00:00Z", { sinal_recebido_em: "2026-11-02T12:00:00Z" }),
      aprovado("2026-10-01T12:00:00Z", { sinal_recebido_em: "2026-10-02T12:00:00Z" }),
      aprovado("2026-10-01T12:00:00Z"), // não recebido
    ]);
    expect(m.indicadores.sinaisRecebidos).toEqual({
      valor: 30_000,
      anterior: 30_000,
      quantidade: 1,
      comparacao: { tipo: "igual" },
    });
  });
});

describe("taxa de aprovação", () => {
  it("aprovados ÷ (aprovados + recusados) respondidos no período", () => {
    const m = metricas([
      aprovado("2026-11-20T12:00:00Z"),
      aprovado("2026-11-21T12:00:00Z"),
      orc({ status: "recusado", respondido_em: "2026-11-22T12:00:00Z" }),
      orc({ status: "recusado", respondido_em: "2026-10-01T12:00:00Z" }), // anterior
      aprovado("2026-10-02T12:00:00Z"), // anterior
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z" }), // sem resposta: não entra
    ]);
    const t = m.indicadores.taxaAprovacao;
    expect(t.aprovados).toBe(2);
    expect(t.recusados).toBe(1);
    expect(t.valor).toBeCloseTo(66.67, 1);
    expect(t.anterior).toBe(50);
    expect(t.comparacao.tipo).toBe("pontos");
  });

  it("sem respostas no período: null (a tela mostra —)", () => {
    const m = metricas([orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z" })]);
    expect(m.indicadores.taxaAprovacao.valor).toBeNull();
    expect(m.indicadores.taxaAprovacao.comparacao).toEqual({ tipo: "sem_dados" });
  });
});

describe("aguardando resposta", () => {
  it("conta enviados sem resposta e dentro da validade", () => {
    const m = metricas([
      orc({
        status: "enviado",
        enviado_em: "2026-11-20T12:00:00Z",
        valido_ate: "2026-12-10",
      }),
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z", valido_ate: HOJE }), // vale até hoje
      orc({
        status: "enviado",
        enviado_em: "2026-11-01T12:00:00Z",
        valido_ate: "2026-11-23",
      }), // vencido
      aprovado("2026-11-20T12:00:00Z"),
      orc({ status: "rascunho" }),
    ]);
    expect(m.indicadores.aguardandoResposta.valor).toBe(2);
  });

  it("compara com quantos aguardavam na véspera do período", () => {
    const m = metricas([
      // enviado antes, respondido dentro do período: aguardava na véspera
      aprovado("2026-11-01T12:00:00Z", { enviado_em: "2026-10-20T12:00:00Z" }),
      orc({ status: "enviado", enviado_em: "2026-10-20T12:00:00Z" }),
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z" }),
    ]);
    expect(m.indicadores.aguardandoResposta).toMatchObject({ valor: 2, anterior: 2 });
  });
});

describe("gráfico: valor aprovado por mês", () => {
  it("sempre 6 meses, do mais antigo ao atual, independente do filtro", () => {
    const m = metricas([], calcularPeriodo("7d", HOJE));
    expect(m.meses.map((x) => x.mes)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(m.meses.every((x) => x.valor === 0)).toBe(true);
  });

  it("agrupa pelo mês em São Paulo na virada do mês", () => {
    const m = metricas([
      aprovado("2026-11-01T02:30:00Z", { valor: 10_000 }), // 31/10 23:30 em SP → outubro
      aprovado("2026-11-01T03:30:00Z", { valor: 20_000 }), // 01/11 00:30 em SP → novembro
      aprovado("2026-11-20T12:00:00Z", { valor: 5_000 }),
    ]);
    const porMes = Object.fromEntries(m.meses.map((x) => [x.mes, x.valor]));
    expect(porMes["2026-10"]).toBe(10_000);
    expect(porMes["2026-11"]).toBe(25_000);
  });

  it("atravessa a virada do ano", () => {
    const hoje = "2027-01-10";
    const m = metricas(
      [aprovado("2027-01-01T02:00:00Z", { valor: 7_000 })], // 31/12/2026 em SP
      calcularPeriodo("30d", hoje),
      hoje,
      new Date("2027-01-10T15:00:00Z"),
    );
    expect(m.meses.map((x) => x.mes)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(m.meses.find((x) => x.mes === "2026-12")?.valor).toBe(7_000);
  });
});

describe("funil do período", () => {
  it("criados → enviados → visualizados → aprovados, com % sobre os criados", () => {
    const m = metricas([
      orc({ status: "rascunho" }),
      orc({ status: "enviado", enviado_em: "2026-11-10T12:00:00Z" }),
      orc({ status: "enviado", visualizado_em: "2026-11-11T12:00:00Z" }),
      // aprovado à mão, sem visualização registrada: conta como visto (houve resposta)
      orc({ status: "aprovado", respondido_em: "2026-11-12T12:00:00Z" }),
      orc({ status: "aprovado", created_at: "2026-09-01T12:00:00Z" }), // criado fora do período
    ]);
    expect(m.funil.map((e) => [e.rotulo, e.quantidade, e.percentual])).toEqual([
      ["Criados", 4, 100],
      ["Enviados", 3, 75],
      ["Visualizados", 2, 50],
      ["Aprovados", 1, 25],
    ]);
  });

  it("sem orçamentos criados: percentuais vazios", () => {
    expect(
      metricas([]).funil.every((e) => e.quantidade === 0 && e.percentual === null),
    ).toBe(true);
  });
});

describe("precisa da sua atenção", () => {
  it("enviados há MAIS de 3 dias sem resposta, os mais antigos primeiro, no máximo 5", () => {
    const lista = [
      orc({ status: "enviado", enviado_em: "2026-11-21T15:00:00Z" }), // exatamente 3 dias: não
      orc({
        status: "enviado",
        enviado_em: "2026-11-21T14:00:00Z",
        token_publico: "tok",
      }), // 3d1h
      orc({
        status: "enviado",
        enviado_em: "2026-11-01T12:00:00Z",
        valido_ate: "2026-11-20",
      }), // vencido: não
      ...Array.from({ length: 6 }, (_, i) =>
        orc({ status: "enviado", enviado_em: `2026-11-0${i + 1}T12:00:00Z` }),
      ),
    ];
    const g = metricas(lista).atencao.semResposta;
    expect(g.total).toBe(7);
    expect(g.itens).toHaveLength(MAXIMO_POR_GRUPO);
    expect(g.itens[0].diasSemResposta).toBe(23); // enviado em 01/11
    const tresDias = metricas(lista.slice(0, 2)).atencao.semResposta.itens;
    expect(tresDias.map((i) => [i.diasSemResposta, i.token_publico])).toEqual([
      [3, "tok"],
    ]);
  });

  it("enviados que vencem nos próximos 3 dias (hoje incluído)", () => {
    const g = metricas([
      orc({
        status: "enviado",
        enviado_em: "2026-11-20T12:00:00Z",
        valido_ate: "2026-11-27",
      }),
      orc({ status: "enviado", enviado_em: "2026-11-20T12:00:00Z", valido_ate: HOJE }),
      orc({
        status: "enviado",
        enviado_em: "2026-11-20T12:00:00Z",
        valido_ate: "2026-11-28",
      }), // 4 dias
      orc({
        status: "enviado",
        enviado_em: "2026-11-20T12:00:00Z",
        valido_ate: "2026-11-23",
      }), // vencido
      aprovado("2026-11-22T12:00:00Z", { valido_ate: "2026-11-25" }),
    ]).atencao.vencendo;
    expect(g.itens.map((i) => [i.valido_ate, i.diasParaVencer])).toEqual([
      [HOJE, 0],
      ["2026-11-27", 3],
    ]);
  });

  it("aprovados aguardando o sinal, com o valor do sinal", () => {
    const g = metricas([
      aprovado("2026-11-20T12:00:00Z"),
      aprovado("2026-11-02T12:00:00Z", { valor: 200_000 }),
      aprovado("2026-11-03T12:00:00Z", { sinal_recebido_em: "2026-11-04T12:00:00Z" }),
    ]).atencao.aguardandoSinal;
    expect(g.itens.map((i) => [i.aprovadoEm, i.valor])).toEqual([
      ["2026-11-02", 60_000],
      ["2026-11-20", 30_000],
    ]);
  });
});
