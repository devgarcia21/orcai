import { z } from "zod";

import { somenteDigitos } from "@/lib/formatacao";
import { telefoneValido } from "@/lib/pix";

/** Texto opcional: espaços são removidos e vazio vira null. */
export const textoOpcional = (max: number, rotulo: string) =>
  z
    .string()
    .trim()
    .max(max, `${rotulo} pode ter no máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

/** Texto obrigatório com limite de tamanho. */
export const textoObrigatorio = (max: number, mensagemVazio: string, rotulo: string) =>
  z
    .string()
    .trim()
    .min(1, mensagemVazio)
    .max(max, `${rotulo} pode ter no máximo ${max} caracteres.`);

/** Telefone brasileiro opcional: salvo só com dígitos, vazio vira null. */
export const telefoneOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine((d) => d === "" || telefoneValido(d), {
    message: "Digite um telefone válido com DDD, como (11) 98765-4321.",
  })
  .transform((d) => (d === "" ? null : d));

/** E-mail opcional: minúsculo, vazio vira null. */
export const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.email().safeParse(v).success, {
    message: "Digite um e-mail válido, como voce@exemplo.com.",
  })
  .transform((v) => (v === "" ? null : v));

export const uuid = (mensagem: string) => z.uuid({ error: mensagem });
