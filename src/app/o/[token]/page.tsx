import { Download, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  CondicoesObservacoes,
  ItensOrcamento,
} from "@/components/orcamentos/conteudo-orcamento";
import { ResumoValores } from "@/components/orcamentos/resumo-valores";
import {
  BlocoPix,
  SinalRecebido,
  CabecalhoPrestador,
  EsqueletoPublico,
  StatusPublico,
} from "@/components/publico/blocos-publicos";
import { BlocoPagamentoPix } from "@/components/pix/bloco-pagamento-pix";
import { RegistrarVisualizacao } from "@/components/publico/registrar-visualizacao";
import { RespostaCliente } from "@/components/publico/resposta-cliente";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterOrcamentoPublico } from "@/lib/dados/publico";
import { formatarData, hojeISO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { calcularResumo } from "@/lib/orcamento/calculos";
import { clientePodeResponder, numeroComZeros } from "@/lib/orcamento/regras";
import { pixDoOrcamento } from "@/lib/pix/orcamento";
import { nomeDeExibicao } from "@/lib/prestador";
import { rotaPdfPublico } from "@/lib/rotas";
import { cn } from "@/lib/utils";
import {
  mensagemContatoPrestador,
  montarLinkWhatsApp,
  normalizarTelefoneWhatsApp,
} from "@/lib/whatsapp";

type Params = PageProps<"/o/[token]">["params"];

/** Prévia do link no WhatsApp: "Orçamento Nº 0001 – Empresa" + total. */
export async function generateMetadata({
  params,
}: PageProps<"/o/[token]">): Promise<Metadata> {
  const { token } = await params;
  const orcamento = await obterOrcamentoPublico(token);
  if (!orcamento) notFound();

  const { total } = calcularResumo(
    orcamento.itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );
  const titulo = `Orçamento Nº ${numeroComZeros(orcamento.numero)} – ${nomeDeExibicao(orcamento.prestador)}`;
  const descricao = [
    `${orcamento.titulo} · Total: ${formatarMoeda(total)}`,
    orcamento.valido_ate ? `Válido até ${formatarData(orcamento.valido_ate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: { absolute: titulo },
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      locale: "pt_BR",
    },
  };
}

async function OrcamentoDoCliente({ params }: { params: Params }) {
  const { token } = await params;
  const orcamento = await obterOrcamentoPublico(token);
  if (!orcamento) notFound();

  const { prestador } = orcamento;
  const resumo = calcularResumo(
    orcamento.itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );
  const numero = numeroComZeros(orcamento.numero);
  const podeResponder = clientePodeResponder(orcamento, hojeISO());

  // Pagamento do sinal: QR Code só depois da aprovação (antes, só a chave em texto).
  const aprovado = orcamento.status === "aprovado";
  const pix = aprovado
    ? pixDoOrcamento({ prestador, orcamento, referencia: orcamento.referencia_pix })
    : null;
  const mostrarQr = aprovado && !orcamento.sinal_recebido && pix?.disponivel === true;
  const mostrarChaveTexto =
    orcamento.status === "enviado" ||
    (aprovado && !orcamento.sinal_recebido && !mostrarQr);
  const whatsappPrestador = normalizarTelefoneWhatsApp(prestador.telefone)
    ? montarLinkWhatsApp(
        prestador.telefone,
        mensagemContatoPrestador(numero, orcamento.titulo),
      )
    : null;

  return (
    <div className="grid gap-6">
      {orcamento.status === "enviado" && <RegistrarVisualizacao token={token} />}

      <CabecalhoPrestador prestador={prestador} />

      <div>
        <p className="text-sm font-medium text-primary">Orçamento Nº {numero}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          {orcamento.titulo}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Para {orcamento.cliente.nome}
          {orcamento.valido_ate && !orcamento.vencido && (
            <> · Válido até {formatarData(orcamento.valido_ate)}</>
          )}
        </p>
      </div>

      <StatusPublico orcamento={orcamento} />

      {aprovado && orcamento.sinal_recebido && <SinalRecebido />}
      {mostrarQr && pix?.disponivel && <BlocoPagamentoPix pix={pix} />}

      <ItensOrcamento itens={orcamento.itens} />

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumoValores resumo={resumo} />
        </CardContent>
      </Card>

      <CondicoesObservacoes {...orcamento} />

      {mostrarChaveTexto && (
        <BlocoPix
          prestador={prestador}
          valorSinal={resumo.sinal}
          percentualSinal={resumo.percentualSinal}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={rotaPdfPublico(token, true)}
          download
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
        >
          <Download aria-hidden />
          Baixar PDF
        </a>
        {whatsappPrestador && (
          <a
            href={whatsappPrestador}
            target="_blank"
            rel="noopener"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            <MessageCircle aria-hidden />
            Falar com o prestador
          </a>
        )}
      </div>

      {/* Sempre no mesmo lugar: após responder, a confirmação continua visível. */}
      <RespostaCliente token={token} podeResponder={podeResponder} />
    </div>
  );
}

/** Página que o cliente abre pelo WhatsApp. Sem login. */
export default function OrcamentoPublicoPage({ params }: PageProps<"/o/[token]">) {
  return (
    <Suspense fallback={<EsqueletoPublico />}>
      <OrcamentoDoCliente params={params} />
    </Suspense>
  );
}
