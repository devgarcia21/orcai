import { z } from "zod";

import { normalizarBusca } from "@/lib/busca";
import {
  formatarMoeda,
  formatarQuantidade,
  lerQuantidade,
  MOEDA_MAXIMA_CENTAVOS,
  QUANTIDADE_MAXIMA,
} from "@/lib/moeda";
import type { UnidadeItem } from "@/lib/types/database";

import { palavrasEmComum, type ItemHistorico } from "./historico";
import { valoresNoTexto } from "./precos-texto";
import { MAXIMO_ITENS_IA } from "./prompt";
import { ErroIA } from "./provedor";
import { normalizarUnidade } from "./unidades";

/** De onde veio o valor: escrito pelo prestador, do histórico, ou nenhum. */
export type OrigemValor = "informado" | "historico" | null;

/** Item sugerido pela IA, já validado. `null` no valor = "Defina o valor". */
export type ItemSugerido = {
  descricao: string;
  quantidade: number;
  unidade: UnidadeItem;
  valor_unitario_centavos: number | null;
  origem_valor: OrigemValor;
};

export type SugestaoIA = {
  titulo: string;
  itens: ItemSugerido[];
  /** Avisos para o prestador (itens descartados, cortados etc.). */
  avisos: string[];
};

const DESCRICAO_MAXIMA = 300;
const TITULO_MAXIMO = 150;

/** Formato mínimo do topo da resposta: sem isto, a resposta inteira é inválida. */
const respostaSchema = z.object({
  titulo: z.unknown().optional(),
  itens: z.array(z.unknown()),
});

/** Cada item é validado sozinho: um item ruim não derruba os outros. */
const itemSchema = z.object({
  descricao: z
    .string()
    .transform((d) => d.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(DESCRICAO_MAXIMA)),
  quantidade: z.union([z.number(), z.string()]).transform((q, ctx) => {
    const n = typeof q === "number" ? Math.round(q * 100) / 100 : lerQuantidade(q);
    if (n === null || !Number.isFinite(n) || n <= 0 || n > QUANTIDADE_MAXIMA) {
      ctx.addIssue({ code: "custom", message: "Quantidade inválida" });
      return z.NEVER;
    }
    return n;
  }),
  unidade: z.unknown().transform((u, ctx) => {
    const unidade = normalizarUnidade(u);
    if (!unidade) {
      ctx.addIssue({ code: "custom", message: "Unidade desconhecida" });
      return z.NEVER;
    }
    return unidade;
  }),
  indice_historico: z.number().int().nullable().optional().catch(null),
  valor_informado_centavos: z.number().int().positive().nullable().optional().catch(null),
  valor_informado_tipo: z.enum(["unitario", "total"]).nullable().optional().catch(null),
});

/**
 * Valor que o PRESTADOR escreveu para o item. Só vale se o número aparece de
 * verdade no texto (a IA não consegue "inventar" um preço que ele não escreveu):
 * - "unitario" → é o valor unitário ("3 tomadas a 20 reais cada" → R$ 20);
 * - "total" → dividido pela quantidade ("3 tomadas por 60 reais" → R$ 20);
 * - se a IA marcou "unitario" mas já dividiu um total escrito, também aceita.
 * `arredondado` = o total não dividiu certinho em centavos (avisar o prestador).
 */
export function valorInformado(
  item: {
    quantidade: number;
    valor_informado_centavos?: number | null;
    valor_informado_tipo?: "unitario" | "total" | null;
  },
  valoresDoTexto: Set<number>,
): { valor: number; arredondado: boolean; total?: number } | null {
  const valor = item.valor_informado_centavos;
  if (!valor || !item.valor_informado_tipo) return null;

  const dividir = (total: number) => {
    const unitario = Math.round(total / item.quantidade);
    return { valor: unitario, arredondado: unitario * item.quantidade !== total, total };
  };

  let resultado: { valor: number; arredondado: boolean; total?: number } | null = null;
  if (item.valor_informado_tipo === "total" && valoresDoTexto.has(valor)) {
    resultado = dividir(valor);
  } else if (item.valor_informado_tipo === "unitario" && valoresDoTexto.has(valor)) {
    resultado = { valor, arredondado: false };
  } else if (
    item.valor_informado_tipo === "unitario" &&
    valoresDoTexto.has(Math.round(valor * item.quantidade))
  ) {
    resultado = { valor, arredondado: false };
  }

  if (!resultado || resultado.valor <= 0 || resultado.valor > MOEDA_MAXIMA_CENTAVOS)
    return null;
  return resultado;
}

/**
 * Valor do histórico — nunca o número que a IA escreveu:
 *
 * 1. a IA apontou um índice do histórico, com a mesma unidade e pelo menos uma
 *    palavra em comum na descrição → valor desse item do histórico;
 * 2. senão, se existe no histórico um item com a MESMA descrição (sem acento)
 *    e a mesma unidade → valor dele;
 * 3. senão → null (o prestador define o valor).
 *
 * Assim, mesmo que o modelo "invente" um preço, ele é descartado.
 */
export function valorDoHistorico(
  item: { descricao: string; unidade: UnidadeItem; indice_historico?: number | null },
  historico: ItemHistorico[],
): number | null {
  const indice = item.indice_historico;
  if (typeof indice === "number" && Number.isInteger(indice)) {
    const referencia = historico[indice];
    if (
      referencia &&
      referencia.unidade === item.unidade &&
      palavrasEmComum(referencia.descricao, item.descricao) > 0
    ) {
      return referencia.valor_unitario_centavos;
    }
  }

  const descricao = normalizarBusca(item.descricao);
  const igual = historico.find(
    (h) => h.unidade === item.unidade && normalizarBusca(h.descricao) === descricao,
  );
  return igual ? igual.valor_unitario_centavos : null;
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/**
 * Valida e normaliza a resposta da IA. Itens com problema são descartados
 * (com aviso) e repetidos são juntados. Prioridade do valor:
 * escrito pelo prestador no texto → histórico de preços → vazio ("Defina o valor").
 * Se nem o formato geral estiver certo, lança ErroIA "resposta_invalida".
 *
 * @param texto o pedido do prestador (para conferir os valores escritos nele).
 */
export function normalizarResposta(
  json: unknown,
  historico: ItemHistorico[],
  texto = "",
): SugestaoIA {
  const topo = respostaSchema.safeParse(json);
  if (!topo.success) {
    throw new ErroIA("resposta_invalida", "Resposta fora do formato esperado");
  }

  const titulo =
    typeof topo.data.titulo === "string"
      ? topo.data.titulo.trim().replace(/\s+/g, " ").slice(0, TITULO_MAXIMO).trim()
      : "";

  const itens: ItemSugerido[] = [];
  const porChave = new Map<string, ItemSugerido>();
  let descartados = 0;
  let repetidos = 0;
  const valoresDoTexto = valoresNoTexto(texto);
  const arredondados: string[] = [];

  for (const bruto of topo.data.itens) {
    const lido = itemSchema.safeParse(bruto);
    if (!lido.success) {
      descartados++;
      continue;
    }
    const { descricao, quantidade, unidade } = lido.data;

    // Repetido (mesma descrição sem acento + mesma unidade): soma as quantidades.
    const chave = `${normalizarBusca(descricao)}|${unidade}`;
    const existente = porChave.get(chave);
    if (existente) {
      existente.quantidade = Math.min(
        Math.round((existente.quantidade + quantidade) * 100) / 100,
        QUANTIDADE_MAXIMA,
      );
      repetidos++;
      continue;
    }

    const informado = valorInformado(lido.data, valoresDoTexto);
    const doHistorico = informado ? null : valorDoHistorico(lido.data, historico);
    if (informado?.arredondado && informado.total) {
      arredondados.push(
        `"${descricao}": ${formatarMoeda(informado.total)} ÷ ${formatarQuantidade(quantidade)} = ${formatarMoeda(informado.valor)} cada (arredondado)`,
      );
    }
    const item: ItemSugerido = {
      descricao,
      quantidade,
      unidade,
      valor_unitario_centavos: informado?.valor ?? doHistorico,
      origem_valor: informado ? "informado" : doHistorico !== null ? "historico" : null,
    };
    porChave.set(chave, item);
    itens.push(item);
  }

  const avisos: string[] = [];
  if (descartados > 0) {
    avisos.push(
      `${descartados} ${plural(descartados, "item veio incompleto da IA e foi descartado", "itens vieram incompletos da IA e foram descartados")}. Confira se falta algo.`,
    );
  }
  if (repetidos > 0) {
    avisos.push(
      `${plural(repetidos, "Um item repetido foi juntado", `${repetidos} itens repetidos foram juntados`)} (quantidades somadas).`,
    );
  }
  if (arredondados.length > 0) {
    avisos.push(`Confira o valor unitário: ${arredondados.join("; ")}.`);
  }
  if (itens.length > MAXIMO_ITENS_IA) {
    avisos.push(`Mostrando só os primeiros ${MAXIMO_ITENS_IA} itens.`);
  }

  return { titulo, itens: itens.slice(0, MAXIMO_ITENS_IA), avisos };
}
