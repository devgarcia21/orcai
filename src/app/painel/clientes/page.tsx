import type { Metadata } from "next";

import { BotaoNovoCliente, ListaClientes } from "@/components/clientes/lista-clientes";
import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { listarClientes } from "@/lib/dados/clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const clientes = await listarClientes();

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Clientes"
        descricao={
          clientes.length > 0
            ? `${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`
            : "Cadastre quem você atende para montar orçamentos mais rápido."
        }
        acoes={clientes.length > 0 && <BotaoNovoCliente />}
      />
      <ListaClientes clientes={clientes} />
    </div>
  );
}
