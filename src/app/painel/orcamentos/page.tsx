import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { ListaOrcamentos } from "@/components/orcamentos/lista-orcamentos";
import { EsqueletoListaOrcamentos } from "@/components/painel/esqueletos";
import { listarOrcamentos } from "@/lib/dados/orcamentos";

export const metadata: Metadata = { title: "Orçamentos" };

async function Lista() {
  const orcamentos = await listarOrcamentos();
  return <ListaOrcamentos orcamentos={orcamentos} />;
}

export default function OrcamentosPage() {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Orçamentos"
        descricao="Acompanhe o andamento de cada orçamento."
        acoes={<BotaoNovoOrcamento className="w-full sm:w-auto" />}
      />
      <Suspense fallback={<EsqueletoListaOrcamentos />}>
        <Lista />
      </Suspense>
    </div>
  );
}
