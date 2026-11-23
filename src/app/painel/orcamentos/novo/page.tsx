import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { FormularioOrcamento } from "@/components/orcamentos/formulario-orcamento";
import { listarClientes } from "@/lib/dados/clientes";
import { adicionarDias, hojeISO } from "@/lib/datas";
import { VALIDADE_PADRAO_DIAS } from "@/lib/orcamento/regras";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Novo orçamento" };

export default async function NovoOrcamentoPage({
  searchParams,
}: PageProps<"/painel/orcamentos/novo">) {
  const [{ cliente }, clientes] = await Promise.all([searchParams, listarClientes()]);
  const clienteInicial =
    typeof cliente === "string" && clientes.some((c) => c.id === cliente)
      ? cliente
      : undefined;

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: ROTAS.orcamentos, rotulo: "Orçamentos" }}
        titulo="Novo orçamento"
        descricao="Ele será salvo como rascunho. Você pode editar até enviar ao cliente."
      />
      <FormularioOrcamento
        clientes={clientes}
        clienteInicialId={clienteInicial}
        validadePadrao={adicionarDias(hojeISO(), VALIDADE_PADRAO_DIAS)}
      />
    </div>
  );
}
