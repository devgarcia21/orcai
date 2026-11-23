import { z } from "zod";

import {
  emailOpcional,
  telefoneOpcional,
  textoObrigatorio,
  textoOpcional,
} from "./comum";

export const clienteSchema = z.object({
  nome: textoObrigatorio(120, "Informe o nome do cliente.", "O nome"),
  telefone: telefoneOpcional,
  email: emailOpcional,
  endereco: textoOpcional(300, "O endereço"),
  observacoes: textoOpcional(1000, "As observações"),
});

export type ClienteEntrada = z.input<typeof clienteSchema>;
