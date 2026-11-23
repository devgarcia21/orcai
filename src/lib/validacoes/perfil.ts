import { z } from "zod";

import { somenteDigitos } from "@/lib/formatacao";
import { cnpjValido, cpfValido, telefoneValido } from "@/lib/pix";
import { TIPOS_CHAVE_PIX } from "@/lib/types/database";

import { telefoneOpcional, textoOpcional } from "./comum";

export const LOGO_TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB
export const LOGO_TIPOS_ACEITOS = ["image/png", "image/jpeg"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida a logo enviada (regra compartilhada entre navegador e servidor). */
export function validarLogo(arquivo: File): string | null {
  if (!(LOGO_TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    return "A logo precisa ser uma imagem PNG ou JPG.";
  }
  if (arquivo.size > LOGO_TAMANHO_MAXIMO) {
    return "A logo pode ter no máximo 2 MB.";
  }
  return null;
}

export const perfilSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, "Informe seu nome (pelo menos 2 letras).")
      .max(100, "O nome pode ter no máximo 100 caracteres."),
    nome_empresa: textoOpcional(100, "O nome da empresa"),
    telefone: telefoneOpcional,
    cidade: textoOpcional(100, "A cidade"),
    tipo_chave_pix: z
      .union([z.enum(TIPOS_CHAVE_PIX), z.literal("")], {
        error: "Escolha um tipo de chave PIX válido.",
      })
      .transform((v) => (v === "" ? null : v)),
    chave_pix: z.string().trim().max(140, "A chave PIX é longa demais."),
  })
  .transform((dados, ctx) => {
    const { tipo_chave_pix: tipo, chave_pix: chaveBruta } = dados;
    const falhar = (message: string) => {
      ctx.addIssue({ code: "custom", path: ["chave_pix"], message });
      return z.NEVER;
    };

    if (!tipo && !chaveBruta) return { ...dados, tipo_chave_pix: null, chave_pix: null };
    if (!tipo) {
      ctx.addIssue({
        code: "custom",
        path: ["tipo_chave_pix"],
        message: "Escolha o tipo da chave PIX.",
      });
      return z.NEVER;
    }
    if (!chaveBruta) return falhar("Informe a chave PIX.");

    // Normaliza a chave no formato aceito pelo PIX.
    let chave: string;
    switch (tipo) {
      case "cpf":
        chave = somenteDigitos(chaveBruta);
        if (!cpfValido(chave)) return falhar("CPF inválido. Confira os números.");
        break;
      case "cnpj":
        chave = somenteDigitos(chaveBruta);
        if (!cnpjValido(chave)) return falhar("CNPJ inválido. Confira os números.");
        break;
      case "email":
        chave = chaveBruta.toLowerCase();
        if (!z.email().safeParse(chave).success)
          return falhar("Digite um e-mail válido.");
        break;
      case "telefone": {
        const digitos = somenteDigitos(chaveBruta.replace(/^\+55/, ""));
        if (!telefoneValido(digitos)) return falhar("Digite um telefone válido com DDD.");
        chave = `+55${digitos}`;
        break;
      }
      case "aleatoria":
        chave = chaveBruta.toLowerCase();
        if (!UUID.test(chave)) {
          return falhar(
            "A chave aleatória tem 32 letras e números separados por hífens.",
          );
        }
        break;
    }

    return { ...dados, tipo_chave_pix: tipo, chave_pix: chave };
  });

export type PerfilInput = z.input<typeof perfilSchema>;
export type PerfilDados = z.output<typeof perfilSchema>;
