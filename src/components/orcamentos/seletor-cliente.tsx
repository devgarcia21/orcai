"use client";

import { Check, Phone, UserPlus } from "lucide-react";
import { useState } from "react";

import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Button } from "@/components/ui/button";
import { correspondeBusca } from "@/lib/busca";
import { formatarTelefone, somenteDigitos } from "@/lib/formatacao";
import type { Cliente } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const MAXIMO_SUGESTOES = 6;

type Props = {
  clientes: Cliente[];
  selecionadoId: string;
  aoSelecionar: (id: string) => void;
  /** Cliente cadastrado ali mesmo, sem sair da página. */
  aoCriar: (cliente: Cliente) => void;
  erro?: string;
};

export function SeletorCliente({
  clientes,
  selecionadoId,
  aoSelecionar,
  aoCriar,
  erro,
}: Props) {
  const [busca, setBusca] = useState("");
  const [trocando, setTrocando] = useState(!selecionadoId);
  const selecionado = clientes.find((c) => c.id === selecionadoId);

  const botaoNovo = (
    <DialogoCliente
      aoSalvar={(cliente) => {
        aoCriar(cliente);
        setTrocando(false);
        setBusca("");
      }}
      gatilho={
        <Button type="button" variant="outline" className="h-11 w-full">
          <UserPlus aria-hidden />
          Cadastrar novo cliente
        </Button>
      }
    />
  );

  if (selecionado && !trocando) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-primary/5 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary uppercase">
          {selecionado.nome.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{selecionado.nome}</p>
          {selecionado.telefone && (
            <p className="text-sm text-muted-foreground">
              {formatarTelefone(selecionado.telefone)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={() => setTrocando(true)}
        >
          Trocar
        </Button>
      </div>
    );
  }

  const digitos = somenteDigitos(busca);
  const sugestoes = clientes
    .filter(
      (c) =>
        correspondeBusca(busca, [c.nome]) ||
        (digitos.length >= 2 && (c.telefone ?? "").includes(digitos)),
    )
    .slice(0, MAXIMO_SUGESTOES);

  return (
    <div className="grid gap-3">
      {clientes.length > 0 && (
        <>
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar cliente por nome ou telefone"
            rotulo="Buscar cliente"
          />
          {sugestoes.length > 0 ? (
            <ul
              className={cn(
                "divide-y overflow-hidden rounded-xl border bg-background",
                erro && "border-destructive",
              )}
              role="listbox"
              aria-label="Clientes"
            >
              {sugestoes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.id === selecionadoId}
                    onClick={() => {
                      aoSelecionar(c.id);
                      setTrocando(false);
                      setBusca("");
                    }}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.nome}</span>
                      {c.telefone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="size-3" aria-hidden />
                          {formatarTelefone(c.telefone)}
                        </span>
                      )}
                    </span>
                    {c.id === selecionadoId && <Check className="size-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente encontrado para &quot;{busca}&quot;.
            </p>
          )}
        </>
      )}

      {clientes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Você ainda não tem clientes. Cadastre o primeiro agora:
        </p>
      )}
      {botaoNovo}
      {selecionado && (
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={() => setTrocando(false)}
        >
          Manter {selecionado.nome}
        </Button>
      )}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
