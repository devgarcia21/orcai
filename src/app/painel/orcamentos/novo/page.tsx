import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { FormularioOrcamento } from "@/components/orcamentos/formulario-orcamento";
import { EsqueletoFormularioOrcamento } from "@/components/painel/esqueletos";
import { listarClientes } from "@/lib/dados/clientes";
import { adicionarDias, hojeISO } from "@/lib/datas";
import { iaConfigurada } from "@/lib/ia/configuracao";
import { VALIDADE_PADRAO_DIAS } from "@/lib/orcamento/regras";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Novo orçamento" };

type SearchParams = PageProps<"/painel/orcamentos/novo">["searchParams"];

async function NovoOrcamento({ searchParams }: { searchParams: SearchParams }) {
  const [{ cliente }, clientes] = await Promise.all([searchParams, listarClientes()]);
  const clienteInicial =
    typeof cliente === "string" && clientes.some((c) => c.id === cliente)
      ? cliente
      : undefined;

  return (
    <FormularioOrcamento
      clientes={clientes}
      clienteInicialId={clienteInicial}
      validadePadrao={adicionarDias(hojeISO(), VALIDADE_PADRAO_DIAS)}
      iaDisponivel={iaConfigurada()}
    />
  );
}

/** Casca: título aparece na hora; o formulário (com a lista de clientes) chega em streaming. */
export default function NovoOrcamentoPage({
  searchParams,
}: PageProps<"/painel/orcamentos/novo">) {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: ROTAS.orcamentos, rotulo: "Orçamentos" }}
        titulo="Novo orçamento"
        descricao="Ele será salvo como rascunho. Você pode editar até enviar ao cliente."
      />
      <Suspense fallback={<EsqueletoFormularioOrcamento />}>
        <NovoOrcamento searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
