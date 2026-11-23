"use client";

import { useState, type ReactElement } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Cliente } from "@/lib/types/database";

import { FormularioCliente } from "./formulario-cliente";

type Props = {
  gatilho: ReactElement;
  cliente?: Cliente;
  aoSalvar?: (cliente: Cliente) => void;
};

/**
 * Cadastro/edição de cliente num diálogo, para não sair da página atual
 * (usado na lista de clientes e dentro do formulário de orçamento).
 */
export function DialogoCliente({ gatilho, cliente, aoSalvar }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={gatilho} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {cliente
              ? "Atualize os dados de contato do cliente."
              : "Só o nome é obrigatório. O telefone ajuda a enviar pelo WhatsApp depois."}
          </DialogDescription>
        </DialogHeader>
        {/* Só monta quando aberto: cada abertura começa com o formulário limpo. */}
        {aberto && (
          <FormularioCliente
            cliente={cliente}
            aoSalvar={(salvo) => {
              setAberto(false);
              aoSalvar?.(salvo);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
