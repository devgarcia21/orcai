import type { Metadata } from "next";
import { Suspense } from "react";

import { BotaoNovoCliente, ListaClientes } from "@/components/clientes/lista-clientes";
import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { EsqueletoListaClientes } from "@/components/painel/esqueletos";
import { listarClientes } from "@/lib/dados/clientes";

export const metadata: Metadata = { title: "Clientes" };

async function Lista() {
  const clientes = await listarClientes();
  return <ListaClientes clientes={clientes} />;
}

export default function ClientesPage() {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Cadastre quem você atende para montar orçamentos mais rápido."
        acoes={<BotaoNovoCliente />}
      />
      <Suspense fallback={<EsqueletoListaClientes />}>
        <Lista />
      </Suspense>
    </div>
  );
}
