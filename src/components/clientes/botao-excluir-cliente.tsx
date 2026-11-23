"use client";

import { Trash2 } from "lucide-react";

import { excluirCliente, excluirClienteEVoltar } from "@/actions/clientes";
import { ConfirmarAcao } from "@/components/comum/confirmar-acao";
import { Button } from "@/components/ui/button";

type Props = {
  cliente: { id: string; nome: string };
  totalOrcamentos: number;
  /** Na página do próprio cliente, volta para a lista após excluir. */
  voltarParaLista?: boolean;
  compacto?: boolean;
};

export function BotaoExcluirCliente({
  cliente,
  totalOrcamentos,
  voltarParaLista,
  compacto,
}: Props) {
  const bloqueio =
    totalOrcamentos > 0
      ? `${cliente.nome} tem ${totalOrcamentos} ${totalOrcamentos === 1 ? "orçamento" : "orçamentos"}. Para manter o histórico, clientes com orçamentos não podem ser excluídos. Exclua os orçamentos dele antes, se realmente quiser removê-lo.`
      : undefined;

  return (
    <ConfirmarAcao
      gatilho={
        <Button
          variant="ghost"
          size={compacto ? "icon" : "default"}
          className={
            compacto ? "size-10 text-muted-foreground hover:text-destructive" : "h-10"
          }
          aria-label={`Excluir ${cliente.nome}`}
        >
          <Trash2 aria-hidden />
          {!compacto && "Excluir"}
        </Button>
      }
      titulo={`Excluir ${cliente.nome}?`}
      descricao="O cliente será removido permanentemente. Essa ação não pode ser desfeita."
      textoConfirmar="Excluir cliente"
      destrutivo
      bloqueio={bloqueio}
      aoConfirmar={() =>
        voltarParaLista ? excluirClienteEVoltar(cliente.id) : excluirCliente(cliente.id)
      }
    />
  );
}
