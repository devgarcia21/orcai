import { z } from "zod";

import { dataISOValida } from "@/lib/datas";
import {
  formatarMoeda,
  lerQuantidade,
  MOEDA_MAXIMA_CENTAVOS,
  QUANTIDADE_MAXIMA,
} from "@/lib/moeda";
import { subtotal } from "@/lib/orcamento/calculos";
import { MAXIMO_ITENS } from "@/lib/orcamento/regras";
import { STATUS_ORCAMENTO, UNIDADES_ITEM } from "@/lib/types/database";

import { textoObrigatorio, textoOpcional, uuid } from "./comum";

const centavos = (rotulo: string) =>
  z
    .number({ error: `${rotulo} inválido.` })
    .int(`${rotulo} inválido.`)
    .min(0, `${rotulo} não pode ser negativo.`)
    .max(
      MOEDA_MAXIMA_CENTAVOS,
      `${rotulo} pode ser no máximo ${formatarMoeda(MOEDA_MAXIMA_CENTAVOS)}.`,
    );

/**
 * Item como vem do formulário: a quantidade chega como texto digitado ("2,5")
 * e é lida pelo mesmo helper usado na tela.
 */
export const itemOrcamentoSchema = z.object({
  descricao: textoObrigatorio(300, "Descreva o item.", "A descrição"),
  quantidade: z.string().transform((texto, ctx) => {
    const valor = lerQuantidade(texto);
    if (valor === null) {
      ctx.addIssue({
        code: "custom",
        message: "Use números, com até 2 casas decimais (ex.: 2,5).",
      });
      return z.NEVER;
    }
    if (valor <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "A quantidade precisa ser maior que zero.",
      });
      return z.NEVER;
    }
    if (valor > QUANTIDADE_MAXIMA) {
      ctx.addIssue({ code: "custom", message: "Quantidade grande demais." });
      return z.NEVER;
    }
    return valor;
  }),
  unidade: z.enum(UNIDADES_ITEM, { error: "Escolha a unidade." }),
  valor_unitario_centavos: centavos("Valor unitário"),
});

export const orcamentoSchema = z
  .object({
    cliente_id: uuid("Escolha o cliente do orçamento."),
    titulo: textoObrigatorio(150, "Dê um título ao orçamento.", "O título"),
    itens: z
      .array(itemOrcamentoSchema)
      .min(1, "Adicione pelo menos um item.")
      .max(MAXIMO_ITENS, `Use no máximo ${MAXIMO_ITENS} itens.`),
    desconto_centavos: centavos("Desconto"),
    percentual_sinal: z
      .number({ error: "Percentual inválido." })
      .int("Use um número inteiro de 0 a 100.")
      .min(0, "O sinal vai de 0% a 100%.")
      .max(100, "O sinal vai de 0% a 100%."),
    valido_ate: z
      .string()
      .refine((v) => v === "" || dataISOValida(v), {
        message: "Data de validade inválida.",
      })
      .transform((v) => (v === "" ? null : v)),
    condicoes_pagamento: textoOpcional(1000, "As condições de pagamento"),
    observacoes: textoOpcional(2000, "As observações"),
  })
  .superRefine((orcamento, ctx) => {
    // Recalcula no servidor: o desconto nunca pode passar do subtotal.
    const sub = subtotal(orcamento.itens);
    if (orcamento.desconto_centavos > sub) {
      ctx.addIssue({
        code: "custom",
        path: ["desconto_centavos"],
        message: `O desconto não pode ser maior que o subtotal (${formatarMoeda(sub)}).`,
      });
    }
  });

/** Formato enviado pelo formulário. */
export type OrcamentoEntrada = z.input<typeof orcamentoSchema>;
/** Formato validado e normalizado, pronto para gravar. */
export type OrcamentoValidado = z.output<typeof orcamentoSchema>;

export const statusSchema = z.enum(STATUS_ORCAMENTO);
