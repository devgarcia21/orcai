"use client";

import { ChevronRight, Pencil, Phone, SearchX, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CampoBusca } from "@/components/comum/campo-busca";
import { EstadoVazio } from "@/components/comum/estado-vazio";
import { Button } from "@/components/ui/button";
import { correspondeBusca } from "@/lib/busca";
import { formatarTelefone, somenteDigitos } from "@/lib/formatacao";
import { rotaCliente } from "@/lib/rotas";
import type { ClienteComContagem } from "@/lib/types/database";

import { BotaoExcluirCliente } from "./botao-excluir-cliente";
import { DialogoCliente } from "./dialogo-cliente";

export function BotaoNovoCliente({ largo }: { largo?: boolean }) {
  return (
    <DialogoCliente
      gatilho={
        <Button size="lg" className={largo ? "h-11 w-full" : "h-11"}>
          <UserPlus aria-hidden />
          Novo cliente
        </Button>
      }
    />
  );
}

/** Busca por nome ou telefone (com ou sem máscara). */
function filtrar(clientes: ClienteComContagem[], termo: string) {
  const digitos = somenteDigitos(termo);
  return clientes.filter(
    (c) =>
      correspondeBusca(termo, [c.nome]) ||
      (digitos.length >= 2 && (c.telefone ?? "").includes(digitos)),
  );
}

export function ListaClientes({ clientes }: { clientes: ClienteComContagem[] }) {
  const [busca, setBusca] = useState("");

  if (clientes.length === 0) {
    return (
      <EstadoVazio
        icone={Users}
        titulo="Você ainda não tem clientes"
        descricao="Cadastre seus clientes para montar orçamentos mais rápido."
        acao={<BotaoNovoCliente largo />}
      />
    );
  }

  const filtrados = filtrar(clientes, busca);

  return (
    <div className="grid gap-4">
      <CampoBusca
        valor={busca}
        aoMudar={setBusca}
        placeholder="Buscar por nome ou telefone"
        rotulo="Buscar clientes"
      />

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhum cliente encontrado"
          descricao={`Nada corresponde a "${busca}". Confira a busca ou cadastre um novo cliente.`}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {filtrados.map((cliente) => (
            <li key={cliente.id} className="flex items-center gap-1 pr-2">
              <Link
                href={rotaCliente(cliente.id)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary uppercase">
                  {cliente.nome.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{cliente.nome}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {cliente.telefone ? (
                      <>
                        <Phone className="size-3" aria-hidden />
                        {formatarTelefone(cliente.telefone)}
                      </>
                    ) : (
                      "Sem telefone"
                    )}
                    <span aria-hidden>·</span>
                    {cliente.total_orcamentos}{" "}
                    {cliente.total_orcamentos === 1 ? "orçamento" : "orçamentos"}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
              <DialogoCliente
                cliente={cliente}
                gatilho={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted-foreground"
                    aria-label={`Editar ${cliente.nome}`}
                  >
                    <Pencil aria-hidden />
                  </Button>
                }
              />
              <BotaoExcluirCliente
                cliente={cliente}
                totalOrcamentos={cliente.total_orcamentos}
                compacto
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
