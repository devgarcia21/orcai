import { z } from "zod";

import { normalizarBusca } from "@/lib/busca";
import { lerQuantidade, QUANTIDADE_MAXIMA } from "@/lib/moeda";
import type { UnidadeItem } from "@/lib/types/database";

import { palavrasEmComum, type ItemHistorico } from "./historico";
import { MAXIMO_ITENS_IA } from "./prompt";
import { ErroIA } from "./provedor";
import { normalizarUnidade } from "./unidades";

/** Item sugerido pela IA, já validado. `null` no valor = "Defina o valor". */
export type ItemSugerido = {
  descricao: string;
  quantidade: number;
  unidade: UnidadeItem;
  valor_unitario_centavos: number | null;
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
});

/**
 * Valor do item SEMPRE vindo do histórico, nunca do número que a IA escreveu:
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
 * (com aviso), repetidos são juntados e o valor só vem do histórico.
 * Se nem o formato geral estiver certo, lança ErroIA "resposta_invalida".
 */
export function normalizarResposta(
  json: unknown,
  historico: ItemHistorico[],
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

    const item: ItemSugerido = {
      descricao,
      quantidade,
      unidade,
      valor_unitario_centavos: valorDoHistorico(lido.data, historico),
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
  if (itens.length > MAXIMO_ITENS_IA) {
    avisos.push(`Mostrando só os primeiros ${MAXIMO_ITENS_IA} itens.`);
  }

  return { titulo, itens: itens.slice(0, MAXIMO_ITENS_IA), avisos };
}
