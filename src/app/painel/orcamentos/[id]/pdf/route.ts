import type { NextRequest } from "next/server";

import { obterOrcamento } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { nomeArquivoPdf } from "@/lib/pdf/nome-arquivo";
import { baixarLogo, gerarPdfOrcamento } from "@/lib/pdf/gerar-pdf";
import { createClient } from "@/lib/supabase/server";

/**
 * PDF do orçamento, gerado na hora no servidor.
 * - Não logado: 401 (o proxy já redireciona para o login antes de chegar aqui).
 * - Orçamento de outro prestador ou inexistente: 404 (RLS + filtro por prestador).
 * - ?download=1 força o download; sem ele, o navegador abre o PDF.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/painel/orcamentos/[id]/pdf">,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return new Response("Faça login para ver este orçamento.", { status: 401 });
  }

  const { id } = await ctx.params;
  const [orcamento, prestador] = await Promise.all([
    obterOrcamento(id),
    obterPrestadorAtual(),
  ]);
  if (!orcamento) {
    return new Response("Orçamento não encontrado.", { status: 404 });
  }

  const logo = await baixarLogo(prestador.logo_url);
  const pdf = await gerarPdfOrcamento({ prestador, orcamento, logo });

  const nome = nomeArquivoPdf(orcamento.numero, orcamento.cliente.nome);
  const disposicao = request.nextUrl.searchParams.get("download")
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${disposicao}; filename="${nome}"`,
      // Documento com dados do prestador e do cliente: nunca em cache compartilhado.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
