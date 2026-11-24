import type { NextRequest } from "next/server";

import { obterOrcamentoPublico } from "@/lib/dados/publico";
import { baixarLogo, gerarPdfOrcamento } from "@/lib/pdf/gerar-pdf";
import { nomeArquivoPdf } from "@/lib/pdf/nome-arquivo";

/**
 * PDF do orçamento para o cliente (sem login), pelo token secreto.
 * Reutiliza exatamente o mesmo documento do painel (Etapa 3).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/o/[token]/pdf">) {
  const { token } = await ctx.params;
  const orcamento = await obterOrcamentoPublico(token);
  if (!orcamento) {
    return new Response("Orçamento não encontrado.", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const logo = await baixarLogo(orcamento.prestador.logo_url);
  const pdf = await gerarPdfOrcamento({
    prestador: orcamento.prestador,
    orcamento,
    logo,
    referenciaPix: orcamento.referencia_pix,
  });

  const nome = nomeArquivoPdf(orcamento.numero, orcamento.cliente.nome);
  const disposicao = request.nextUrl.searchParams.get("download")
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${disposicao}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
