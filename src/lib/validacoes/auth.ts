import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .pipe(z.email("Digite um e-mail válido, como voce@exemplo.com."));

export const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome (pelo menos 2 letras).")
    .max(100, "O nome pode ter no máximo 100 caracteres."),
  email,
  senha: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha."),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
