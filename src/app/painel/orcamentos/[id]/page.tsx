import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { AcoesOrcamento } from "@/components/orcamentos/acoes-orcamento";
import { BadgeStatus } from "@/components/orcamentos/badge-status";
import { ResumoValores } from "@/components/orcamentos/resumo-valores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { nomeDeExibicao, obterPrestadorAtual } from "@/lib/dados/prestador";
import { formatarData, hojeISO } from "@/lib/datas";
import { formatarTelefone } from "@/lib/formatacao";
import { formatarMoeda, formatarQuantidade } from "@/lib/moeda";
import { calcularResumo, totalItem } from "@/lib/orcamento/calculos";
import { formatarNumeroOrcamento, ROTULOS_UNIDADE } from "@/lib/orcamento/regras";
import { rotaCliente, ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Orçamento" };

function BlocoTexto({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{titulo}</h3>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{texto}</p>
    </div>
  );
}

export default async function OrcamentoPage({
  params,
}: PageProps<"/painel/orcamentos/[id]">) {
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
  const vencido =
    orcamento.valido_ate !== null &&
    orcamento.valido_ate < hojeISO() &&
    (orcamento.status === "rascunho" || orcamento.status === "enviado");

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: ROTAS.orcamentos, rotulo: "Orçamentos" }}
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
          />
        </CardContent>
      </Card>

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

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens ({itens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {itens.map((item, i) => (
                  <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{item.descricao}</p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {formatarQuantidade(item.quantidade)}{" "}
                        {ROTULOS_UNIDADE[item.unidade].curto} ×{" "}
                        {formatarMoeda(item.valor_unitario_centavos)}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatarMoeda(totalItem(item))}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {(orcamento.condicoes_pagamento || orcamento.observacoes) && (
            <Card>
              <CardContent className="grid gap-4">
                <BlocoTexto
                  titulo="Condições de pagamento"
                  texto={orcamento.condicoes_pagamento}
                />
                <BlocoTexto titulo="Observações" texto={orcamento.observacoes} />
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResumoValores resumo={resumo} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
