import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { FormularioOrcamento } from "@/components/orcamentos/formulario-orcamento";
import { EsqueletoFormularioOrcamento } from "@/components/painel/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";
import { listarClientes } from "@/lib/dados/clientes";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { adicionarDias, hojeISO } from "@/lib/datas";
import { iaConfigurada } from "@/lib/ia/configuracao";
import {
  formatarNumeroOrcamento,
  orcamentoEditavel,
  VALIDADE_PADRAO_DIAS,
} from "@/lib/orcamento/regras";
import { rotaOrcamento, ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Editar orçamento" };

type Params = PageProps<"/painel/orcamentos/[id]/editar">["params"];

async function EdicaoOrcamento({ params }: { params: Params }) {
  const { id } = await params;
  const [orcamento, clientes] = await Promise.all([obterOrcamento(id), listarClientes()]);
  if (!orcamento) notFound();
  // Aprovados/recusados não são editáveis: volta para a visualização.
  if (!orcamentoEditavel(orcamento.status)) redirect(rotaOrcamento(orcamento.id));

  return (
    <>
      <Link
        href={rotaOrcamento(orcamento.id)}
        className="-mt-2 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <span className="font-medium tabular-nums">
          {formatarNumeroOrcamento(orcamento.numero)}
        </span>
        · {orcamento.titulo}
      </Link>
      <FormularioOrcamento
        clientes={clientes}
        orcamento={orcamento}
        validadePadrao={adicionarDias(hojeISO(), VALIDADE_PADRAO_DIAS)}
        iaDisponivel={iaConfigurada()}
      />
    </>
  );
}

/** Casca: título aparece na hora; o formulário preenchido chega em streaming. */
export default function EditarOrcamentoPage({
  params,
}: PageProps<"/painel/orcamentos/[id]/editar">) {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: ROTAS.orcamentos, rotulo: "Orçamentos" }}
        titulo="Editar orçamento"
      />
      <Suspense
        fallback={
          <>
            <Skeleton className="-mt-2 h-4 w-56" />
            <EsqueletoFormularioOrcamento />
          </>
        }
      >
        <EdicaoOrcamento params={params} />
      </Suspense>
    </div>
  );
}
