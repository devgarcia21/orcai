import type { z } from "zod";

/**
 * Estado padrão devolvido por todas as Server Actions de formulário.
 * `errosCampos` usa o caminho do campo como chave: "nome", "itens.0.descricao".
 * `dados` leva um retorno opcional (ex.: o cliente recém-criado).
 */
export type EstadoAcao<T = undefined> = {
  status: "inicial" | "sucesso" | "erro";
  mensagem?: string;
  errosCampos?: Partial<Record<string, string[]>>;
  dados?: T;
};

export const ESTADO_INICIAL: EstadoAcao = { status: "inicial" };

export function erro(
  mensagem: string,
  errosCampos?: EstadoAcao["errosCampos"],
): EstadoAcao<never> {
  return { status: "erro", mensagem, errosCampos };
}

export function sucesso<T = undefined>(mensagem: string, dados?: T): EstadoAcao<T> {
  return { status: "sucesso", mensagem, dados };
}

/** Agrupa as mensagens do zod pelo caminho de cada campo ("itens.0.quantidade"). */
export function errosPorCaminho(error: z.ZodError): Record<string, string[]> {
  const erros: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const caminho = issue.path.map(String).join(".") || "_";
    (erros[caminho] ??= []).push(issue.message);
  }
  return erros;
}

/** Converte um erro do zod no formato de estado esperado pelos formulários. */
export function erroDeValidacao(error: z.ZodError): EstadoAcao<never> {
  return erro("Confira os campos destacados.", errosPorCaminho(error));
}
