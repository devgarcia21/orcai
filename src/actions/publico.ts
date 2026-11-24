"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { erro, erroDeValidacao, sucesso, type EstadoAcao } from "@/lib/acoes";
import { rotaPublicaOrcamento, tokenPublicoValido } from "@/lib/rotas";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { createClient } from "@/lib/supabase/server";
import { ACOES_RESPOSTA, type StatusOrcamento } from "@/lib/types/database";

/**
 * Ações da página pública (/o/[token]), usadas pelo cliente SEM login.
 * Toda a regra de negócio (status, validade, uma resposta só) está nas funções
 * SQL security definer; aqui só validamos a entrada e traduzimos os erros.
 */

const respostaSchema = z.object({
  token: z.string().refine(tokenPublicoValido, "Link inválido."),
  acao: z.enum(ACOES_RESPOSTA, { error: "Resposta inválida." }),
  motivo: z
    .string()
    .trim()
    .max(500, "O motivo pode ter no máximo 500 caracteres.")
    .transform((v) => (v === "" ? null : v)),
});

export async function responderOrcamento(
  token: string,
  acao: string,
  motivo: string = "",
): Promise<EstadoAcao<{ status: StatusOrcamento }>> {
  const parsed = respostaSchema.safeParse({ token, acao, motivo });
  if (!parsed.success) return erroDeValidacao(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("responder_orcamento", {
    p_token: parsed.data.token,
    p_acao: parsed.data.acao,
    p_motivo: parsed.data.acao === "recusar" ? parsed.data.motivo : null,
  });

  if (error || !data) {
    return erro(
      error
        ? traduzirErroBanco(
            error,
            "Não foi possível enviar sua resposta. Tente novamente.",
          )
        : "Não foi possível enviar sua resposta.",
    );
  }

  // Atualiza a página pública com o novo status. (O painel do prestador não
  // guarda dados em cache: mostra a resposta na próxima vez que abrir.)
  revalidatePath(rotaPublicaOrcamento(parsed.data.token));

  const status = data as StatusOrcamento;
  return sucesso(
    status === "aprovado"
      ? "Orçamento aprovado! O prestador já foi avisado."
      : "Resposta enviada. O prestador já foi avisado.",
    { status },
  );
}

/**
 * Registra que o cliente abriu o link. Chamado pelo navegador depois que a
 * página carrega — robôs de prévia (WhatsApp) não executam JavaScript, então
 * não contam. O banco ignora repetições e visitas do próprio prestador.
 */
export async function registrarVisualizacao(token: string): Promise<void> {
  if (!tokenPublicoValido(token)) return;
  const supabase = await createClient();
  await supabase.rpc("obter_orcamento_publico", {
    p_token: token,
    p_registrar_visualizacao: true,
  });
}
