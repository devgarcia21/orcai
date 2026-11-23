import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { FormularioOrcamento } from "@/components/orcamentos/formulario-orcamento";
import { listarClientes } from "@/lib/dados/clientes";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { adicionarDias, hojeISO } from "@/lib/datas";
import {
  formatarNumeroOrcamento,
  orcamentoEditavel,
  VALIDADE_PADRAO_DIAS,
} from "@/lib/orcamento/regras";
import { rotaOrcamento } from "@/lib/rotas";

export const metadata: Metadata = { title: "Editar orçamento" };

export default async function EditarOrcamentoPage({
  params,
}: PageProps<"/painel/orcamentos/[id]/editar">) {
  const { id } = await params;
  const [orcamento, clientes] = await Promise.all([obterOrcamento(id), listarClientes()]);
  if (!orcamento) notFound();
  // Aprovados/recusados não são editáveis: volta para a visualização.
  if (!orcamentoEditavel(orcamento.status)) redirect(rotaOrcamento(orcamento.id));

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: rotaOrcamento(orcamento.id), rotulo: "Voltar ao orçamento" }}
        titulo={`Editar orçamento ${formatarNumeroOrcamento(orcamento.numero)}`}
      />
      <FormularioOrcamento
        clientes={clientes}
        orcamento={orcamento}
        validadePadrao={adicionarDias(hojeISO(), VALIDADE_PADRAO_DIAS)}
      />
    </div>
  );
}
