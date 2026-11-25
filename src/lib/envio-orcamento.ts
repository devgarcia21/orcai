import "server-only";

import { formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { calcularResumo } from "@/lib/orcamento/calculos";
import { numeroComZeros } from "@/lib/orcamento/regras";
import { nomeDeExibicao } from "@/lib/prestador";
import { rotaPublicaOrcamento } from "@/lib/rotas";
import type { OrcamentoCompleto, Prestador } from "@/lib/types/database";
import { urlDoSite } from "@/lib/url-site";
import { mensagemEnvioOrcamento, montarLinkWhatsApp } from "@/lib/whatsapp";

export type DadosEnvio = {
  /** Link público do orçamento (o que o cliente abre). */
  link: string;
  /** wa.me com a mensagem pronta (com o telefone do cliente, se houver). */
  whatsapp: string;
};

/** Monta o link público e o link do WhatsApp com a mensagem padrão. */
export async function montarEnvio(
  orcamento: OrcamentoCompleto,
  prestador: Pick<Prestador, "nome" | "nome_empresa">,
  token: string,
): Promise<DadosEnvio> {
  const link = `${await urlDoSite()}${rotaPublicaOrcamento(token)}`;
  const { total } = calcularResumo(
    orcamento.itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );

  const mensagem = mensagemEnvioOrcamento({
    nomeCliente: orcamento.cliente.nome,
    numero: numeroComZeros(orcamento.numero),
    titulo: orcamento.titulo,
    total: formatarMoeda(total),
    validoAte: orcamento.valido_ate ? formatarData(orcamento.valido_ate) : null,
    link,
    assinatura: nomeDeExibicao(prestador),
  });

  return { link, whatsapp: montarLinkWhatsApp(orcamento.cliente.telefone, mensagem) };
}
