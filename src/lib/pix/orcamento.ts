import { calcularResumo, type ItemCalculavel } from "@/lib/orcamento/calculos";
import { nomeDeExibicao } from "@/lib/prestador";
import type { OrcamentoDocumento, Prestador } from "@/lib/types/database";

import { gerarBrCode, txidOrcamento } from "./brcode";

export type PixOrcamento =
  | {
      disponivel: true;
      /** "PIX Copia e Cola" (também é o conteúdo do QR Code). */
      payload: string;
      valorCentavos: number;
      /** "Sinal (30%)" ou "Valor total" (quando o sinal é 0%). */
      rotulo: string;
    }
  | { disponivel: false; motivo: string };

type Entrada = {
  prestador: Pick<
    Prestador,
    "nome" | "nome_empresa" | "cidade" | "tipo_chave_pix" | "chave_pix"
  >;
  orcamento: Pick<
    OrcamentoDocumento,
    "numero" | "desconto_centavos" | "percentual_sinal"
  > & {
    itens: ItemCalculavel[];
  };
  /** Trecho aleatório e estável do orçamento (8 caracteres do id) para o txid. */
  referencia: string;
};

/**
 * PIX do orçamento: valor do sinal ou, se o sinal for 0%, o valor total.
 * Regra única usada na página do cliente, no painel e no PDF.
 */
export function pixDoOrcamento({
  prestador,
  orcamento,
  referencia,
}: Entrada): PixOrcamento {
  if (!prestador.tipo_chave_pix || !prestador.chave_pix) {
    return { disponivel: false, motivo: "Cadastre sua chave PIX no Perfil." };
  }
  if (!prestador.cidade?.trim()) {
    return {
      disponivel: false,
      motivo: "Cadastre sua cidade no Perfil: ela é obrigatória no QR Code PIX.",
    };
  }

  const resumo = calcularResumo(
    orcamento.itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );
  const usarSinal = resumo.percentualSinal > 0;
  const valorCentavos = usarSinal ? resumo.sinal : resumo.total;
  if (valorCentavos <= 0) return { disponivel: false, motivo: "Não há valor a pagar." };

  const brcode = gerarBrCode({
    tipoChave: prestador.tipo_chave_pix,
    chave: prestador.chave_pix,
    nomeRecebedor: nomeDeExibicao(prestador),
    cidade: prestador.cidade,
    valorCentavos,
    txid: txidOrcamento(orcamento.numero, referencia),
  });
  if (!brcode.ok) return { disponivel: false, motivo: brcode.erro };

  return {
    disponivel: true,
    payload: brcode.payload,
    valorCentavos,
    rotulo: usarSinal ? `Sinal (${resumo.percentualSinal}%)` : "Valor total",
  };
}

/** Referência do txid a partir do id do orçamento (8 primeiros caracteres hex). */
export const referenciaDoId = (id: string) => id.replace(/-/g, "").slice(0, 8);
