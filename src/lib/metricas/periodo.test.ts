import { describe, expect, it } from "vitest";

import { dataNoBrasil, inicioDoDiaNoBrasil } from "@/lib/datas";
import { statusExibicao } from "@/lib/orcamento/regras";

import {
  direcao,
  formatarPercentual,
  rotuloMes,
  textoComparacao,
  textoComparacaoTaxa,
} from "./formatar";
import {
  calcularPeriodo,
  dataMaisAntigaNecessaria,
  lerPeriodo,
  ultimosMeses,
} from "./periodo";

describe("períodos", () => {
  it("lê o período da URL; valor desconhecido vira 30 dias", () => {
    expect(lerPeriodo("7d")).toBe("7d");
    expect(lerPeriodo("mes")).toBe("mes");
    expect(lerPeriodo(["90d"])).toBe("90d");
    expect(lerPeriodo("1ano")).toBe("30d");
    expect(lerPeriodo(undefined)).toBe("30d");
  });

  it("últimos N dias terminam hoje, e o anterior tem o mesmo tamanho", () => {
    expect(calcularPeriodo("7d", "2026-11-24")).toMatchObject({
      atual: { inicio: "2026-11-18", fim: "2026-11-24" },
      anterior: { inicio: "2026-11-11", fim: "2026-11-17" },
      rotuloComparacao: "vs. 7 dias anteriores",
    });
    expect(calcularPeriodo("30d", "2026-11-24").anterior).toEqual({
      inicio: "2026-09-26",
      fim: "2026-10-25",
    });
  });

  it("este mês: do dia 1 até hoje vs. mesmo trecho do mês passado", () => {
    expect(calcularPeriodo("mes", "2026-11-24")).toMatchObject({
      atual: { inicio: "2026-11-01", fim: "2026-11-24" },
      anterior: { inicio: "2026-10-01", fim: "2026-10-24" },
    });
    // 31 de março → fevereiro só vai até o dia 28
    expect(calcularPeriodo("mes", "2026-03-31").anterior).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
    // janeiro → dezembro do ano anterior
    expect(calcularPeriodo("mes", "2027-01-15").anterior).toEqual({
      inicio: "2026-12-01",
      fim: "2026-12-15",
    });
  });

  it("6 meses do gráfico e a data mais antiga a buscar", () => {
    expect(ultimosMeses("2026-02-10")).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    const hoje = "2026-11-24";
    expect(dataMaisAntigaNecessaria(calcularPeriodo("7d", hoje), hoje)).toBe(
      "2026-06-01",
    );
    // 90 dias: o período anterior começa antes do gráfico
    expect(dataMaisAntigaNecessaria(calcularPeriodo("90d", hoje), hoje)).toBe(
      "2026-05-29",
    );
  });
});

describe("datas em São Paulo", () => {
  it("meia-noite em São Paulo em UTC", () => {
    expect(inicioDoDiaNoBrasil("2026-11-01")).toBe("2026-11-01T03:00:00.000Z");
    // horário de verão antigo (UTC-2)
    expect(inicioDoDiaNoBrasil("2018-12-15")).toBe("2018-12-15T02:00:00.000Z");
  });

  it("dia de um timestamp em São Paulo", () => {
    expect(dataNoBrasil("2026-11-01T02:59:00Z")).toBe("2026-10-31");
    expect(dataNoBrasil("2026-11-01T03:00:00Z")).toBe("2026-11-01");
  });
});

describe("status 'Vencido' (só exibição)", () => {
  it("enviado fora da validade aparece como vencido; o resto não muda", () => {
    const hoje = "2026-11-24";
    expect(statusExibicao({ status: "enviado", valido_ate: "2026-11-23" }, hoje)).toBe(
      "vencido",
    );
    expect(statusExibicao({ status: "enviado", valido_ate: hoje }, hoje)).toBe("enviado");
    expect(statusExibicao({ status: "enviado", valido_ate: null }, hoje)).toBe("enviado");
    expect(statusExibicao({ status: "aprovado", valido_ate: "2020-01-01" }, hoje)).toBe(
      "aprovado",
    );
    expect(statusExibicao({ status: "rascunho", valido_ate: "2020-01-01" }, hoje)).toBe(
      "rascunho",
    );
  });
});

describe("textos das comparações", () => {
  const rotulo = "vs. 30 dias anteriores";
  it("percentual com sinal, sem base e sem variação", () => {
    expect(textoComparacao({ tipo: "variacao", percentual: 18.4 }, rotulo)).toBe(
      "+18% vs. 30 dias anteriores",
    );
    expect(textoComparacao({ tipo: "variacao", percentual: -5.6 }, rotulo)).toBe(
      "−6% vs. 30 dias anteriores",
    );
    expect(textoComparacao({ tipo: "sem_base" }, rotulo)).toBe(
      "Antes era zero (30 dias anteriores)",
    );
    expect(textoComparacao({ tipo: "igual" }, rotulo)).toBe(
      "Sem variação vs. 30 dias anteriores",
    );
  });

  it("taxa em pontos percentuais e '—' sem respostas", () => {
    expect(textoComparacaoTaxa({ tipo: "pontos", pontos: 10 }, rotulo)).toBe(
      "+10 p.p. vs. 30 dias anteriores",
    );
    expect(textoComparacaoTaxa({ tipo: "sem_dados" }, rotulo)).toBe(
      "Sem respostas no período",
    );
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarPercentual(66.666)).toBe("67%");
  });

  it("direção e rótulo do mês", () => {
    expect(direcao({ tipo: "variacao", percentual: -3 })).toBe("desce");
    expect(direcao({ tipo: "variacao", percentual: 0.2 })).toBe("igual");
    expect(rotuloMes("2026-11")).toBe("nov");
  });
});
