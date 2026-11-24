import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoPagina, LinkVoltar } from "@/components/comum/cabecalho-pagina";
import { AcoesOrcamento } from "@/components/orcamentos/acoes-orcamento";
import { BadgeStatus } from "@/components/orcamentos/badge-status";
import {
  CondicoesObservacoes,
  ItensOrcamento,
} from "@/components/orcamentos/conteudo-orcamento";
import { LinhaDoTempo } from "@/components/orcamentos/linha-do-tempo";
import { PagamentoSinal } from "@/components/orcamentos/pagamento-sinal";
import { ResumoValores } from "@/components/orcamentos/resumo-valores";
import { EsqueletoDetalheOrcamento } from "@/components/painel/esqueletos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { nomeDeExibicao } from "@/lib/prestador";
import { formatarData, hojeISO } from "@/lib/datas";
import { formatarTelefone } from "@/lib/formatacao";
import { montarEnvio } from "@/lib/envio-orcamento";
import { pixDoOrcamento, referenciaDoId } from "@/lib/pix/orcamento";
import { calcularResumo } from "@/lib/orcamento/calculos";
import {
  formatarNumeroOrcamento,
  orcamentoVencido,
  podeEnviar,
} from "@/lib/orcamento/regras";
import { rotaCliente, ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Orçamento" };

type Params = PageProps<"/painel/orcamentos/[id]">["params"];

async function DetalheOrcamento({ params }: { params: Params }) {
  const { id } = await params;
  const [orcamento, prestador] = await Promise.all([
    obterOrcamento(id),
    obterPrestadorAtual(),
  ]);
  if (!orcamento) notFound();

  const { cliente, itens } = orcamento;
  const resumo = calcularResumo(
    itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );
  const numero = formatarNumeroOrcamento(orcamento.numero);
  // Com link já gerado, os botões de envio funcionam direto no clique.
  const envio =
    orcamento.token_publico && podeEnviar(orcamento.status)
      ? await montarEnvio(orcamento, prestador, orcamento.token_publico)
      : null;
  const vencido =
    podeEnviar(orcamento.status) && orcamentoVencido(orcamento.valido_ate, hojeISO());

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo={orcamento.titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-foreground tabular-nums">{numero}</span>
            <BadgeStatus status={orcamento.status} />
            <span>Criado em {formatarData(orcamento.created_at)}</span>
            {orcamento.valido_ate && (
              <span className={vencido ? "font-medium text-amber-700" : undefined}>
                · {vencido ? "Venceu em" : "Válido até"}{" "}
                {formatarData(orcamento.valido_ate)}
              </span>
            )}
          </span>
        }
      />

      <Card>
        <CardContent>
          <AcoesOrcamento
            orcamento={{
              id: orcamento.id,
              status: orcamento.status,
              numeroFormatado: numero,
            }}
            envio={envio}
          />
        </CardContent>
      </Card>

      {orcamento.status === "aprovado" && (
        <PagamentoSinal
          orcamentoId={orcamento.id}
          pix={pixDoOrcamento({
            prestador,
            orcamento,
            referencia: referenciaDoId(orcamento.id),
          })}
          sinalRecebidoEm={orcamento.sinal_recebido_em}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="grid min-w-0 gap-6">
          {/* De / Para */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
                  Prestador
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-start gap-3 text-sm">
                {prestador.logo_url && (
                  <Image
                    src={prestador.logo_url}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-md border object-contain"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{nomeDeExibicao(prestador)}</p>
                  {prestador.nome_empresa && <p>{prestador.nome}</p>}
                  {prestador.telefone && <p>{formatarTelefone(prestador.telefone)}</p>}
                  {prestador.cidade && (
                    <p className="text-muted-foreground">{prestador.cidade}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <Link
                  href={rotaCliente(cliente.id)}
                  className="font-medium hover:underline"
                >
                  {cliente.nome}
                </Link>
                {cliente.telefone && <p>{formatarTelefone(cliente.telefone)}</p>}
                {cliente.email && <p className="break-words">{cliente.email}</p>}
                {cliente.endereco && (
                  <p className="text-muted-foreground">{cliente.endereco}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <ItensOrcamento itens={itens} />
          <CondicoesObservacoes {...orcamento} />
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumoValores resumo={resumo} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <LinhaDoTempo {...orcamento} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** Casca: o link de voltar aparece na hora; o orçamento chega em streaming. */
export default function OrcamentoPage({ params }: PageProps<"/painel/orcamentos/[id]">) {
  return (
    <div className="grid gap-3">
      <LinkVoltar href={ROTAS.orcamentos} rotulo="Orçamentos" />
      <Suspense fallback={<EsqueletoDetalheOrcamento />}>
        <DetalheOrcamento params={params} />
      </Suspense>
    </div>
  );
}
