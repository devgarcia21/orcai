"use server";

import { revalidatePath } from "next/cache";

import { erro, sucesso, type EstadoAcao } from "@/lib/acoes";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { idValido } from "@/lib/dados/util";
import { montarEnvio, type DadosEnvio } from "@/lib/envio-orcamento";
import { podeEnviar } from "@/lib/orcamento/regras";
import { ROTAS } from "@/lib/rotas";
import { traduzirErroBanco } from "@/lib/supabase/erros";
import { createClient } from "@/lib/supabase/server";

/**
 * Prepara o envio ao cliente: gera o token (se ainda não existir), passa o
 * rascunho para "enviado", grava enviado_em e devolve o link público e o
 * link do WhatsApp com a mensagem pronta.
 */
export async function prepararEnvioOrcamento(
  id: string,
): Promise<EstadoAcao<DadosEnvio>> {
  if (!idValido(id)) return erro("Orçamento inválido.");

  const [orcamento, prestador] = await Promise.all([
    obterOrcamento(id),
    obterPrestadorAtual(),
  ]);
  if (!orcamento) return erro("Orçamento não encontrado.");
  if (!podeEnviar(orcamento.status)) {
    return erro("Orçamentos aprovados ou recusados não podem ser enviados de novo.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("preparar_envio_orcamento", { p_orcamento_id: id })
    .single<{ token_publico: string; status: string }>();

  if (error || !data) {
    return erro(
      error
        ? traduzirErroBanco(error, "Não foi possível preparar o envio. Tente novamente.")
        : "Não foi possível preparar o envio.",
    );
  }

  revalidatePath(ROTAS.painel, "layout");
  return sucesso(
    "Pronto para enviar.",
    await montarEnvio(orcamento, prestador, data.token_publico),
  );
}
