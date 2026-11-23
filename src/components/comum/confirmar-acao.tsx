"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type ReactElement } from "react";

import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { EstadoAcao } from "@/lib/acoes";

type Props = {
  /** Botão que abre o diálogo. */
  gatilho: ReactElement;
  titulo: string;
  descricao: string;
  textoConfirmar: string;
  destrutivo?: boolean;
  /**
   * Ação executada ao confirmar. Se devolver erro, a mensagem aparece no
   * diálogo; se a ação redirecionar, a navegação acontece normalmente.
   */
  aoConfirmar: () => Promise<EstadoAcao<unknown> | void>;
  /** Quando preenchido, o diálogo só explica o motivo e não permite confirmar. */
  bloqueio?: string;
  aoConcluir?: (estado: EstadoAcao<unknown>) => void;
};

export function ConfirmarAcao({
  gatilho,
  titulo,
  descricao,
  textoConfirmar,
  destrutivo,
  aoConfirmar,
  bloqueio,
  aoConcluir,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState<EstadoAcao<unknown> | null>(null);
  const [executando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const estado = await aoConfirmar();
      if (!estado) return;
      if (estado.status === "erro") {
        setResultado(estado);
        return;
      }
      setAberto(false);
      aoConcluir?.(estado);
    });
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (executando) return;
        setAberto(abrir);
        if (abrir) setResultado(null);
      }}
    >
      <AlertDialogTrigger render={gatilho} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {bloqueio ? "Não é possível continuar" : titulo}
          </AlertDialogTitle>
          <AlertDialogDescription>{bloqueio ?? descricao}</AlertDialogDescription>
        </AlertDialogHeader>

        {resultado && <MensagemFormulario estado={resultado} />}

        <AlertDialogFooter>
          <AlertDialogCancel className="h-10" disabled={executando}>
            {bloqueio ? "Entendi" : "Cancelar"}
          </AlertDialogCancel>
          {!bloqueio && (
            <Button
              type="button"
              className="h-10"
              variant={destrutivo ? "destructive" : "default"}
              onClick={confirmar}
              disabled={executando}
            >
              {executando && <Loader2 className="animate-spin" aria-hidden />}
              {textoConfirmar}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
