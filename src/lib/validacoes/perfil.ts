import { z } from "zod";

import { normalizarChavePix } from "@/lib/pix/chave";
import { TIPOS_CHAVE_PIX } from "@/lib/types/database";

import { telefoneOpcional, textoOpcional } from "./comum";

export const LOGO_TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB
export const LOGO_TIPOS_ACEITOS = ["image/png", "image/jpeg"] as const;

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

    // Mesma regra do gerador do QR Code PIX (lib/pix/chave.ts).
    const resultado = normalizarChavePix(tipo, chaveBruta);
    if (!resultado.ok) return falhar(resultado.erro);
    const chave = resultado.chave;

    return { ...dados, tipo_chave_pix: tipo, chave_pix: chave };
  });

export type PerfilInput = z.input<typeof perfilSchema>;
export type PerfilDados = z.output<typeof perfilSchema>;
