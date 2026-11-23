import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { ListaOrcamentos } from "@/components/orcamentos/lista-orcamentos";
import { listarOrcamentos } from "@/lib/dados/orcamentos";

export const metadata: Metadata = { title: "Orçamentos" };

export default async function OrcamentosPage() {
  const orcamentos = await listarOrcamentos();

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Orçamentos"
        descricao="Acompanhe o andamento de cada orçamento."
        acoes={
          orcamentos.length > 0 && <BotaoNovoOrcamento className="w-full sm:w-auto" />
        }
      />
      <ListaOrcamentos orcamentos={orcamentos} />
    </div>
  );
}
