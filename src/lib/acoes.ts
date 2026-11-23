import { z } from "zod";

/** Estado padrão devolvido por todas as Server Actions de formulário. */
export type EstadoAcao = {
  status: "inicial" | "sucesso" | "erro";
  mensagem?: string;
  errosCampos?: Partial<Record<string, string[]>>;
};

export const ESTADO_INICIAL: EstadoAcao = { status: "inicial" };

export function erro(
  mensagem: string,
  errosCampos?: EstadoAcao["errosCampos"],
): EstadoAcao {
  return { status: "erro", mensagem, errosCampos };
}

export function sucesso(mensagem: string): EstadoAcao {
  return { status: "sucesso", mensagem };
}

/** Converte um erro do zod no formato de estado esperado pelos formulários. */
export function erroDeValidacao(error: z.ZodError): EstadoAcao {
  return erro("Confira os campos destacados.", z.flattenError(error).fieldErrors);
}
