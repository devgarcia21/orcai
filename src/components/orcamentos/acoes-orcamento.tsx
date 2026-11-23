"use client";

import {
  Check,
  Copy,
  Loader2,
  Pencil,
  Send,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition } from "react";

import {
  alterarStatusOrcamento,
  duplicarOrcamento,
  excluirOrcamento,
} from "@/actions/orcamentos";
import { ConfirmarAcao } from "@/components/comum/confirmar-acao";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EstadoAcao } from "@/lib/acoes";
import { orcamentoEditavel, proximosStatus } from "@/lib/orcamento/regras";
import { rotaEditarOrcamento } from "@/lib/rotas";
import type { StatusOrcamento } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const ACAO_STATUS: Record<
  Exclude<StatusOrcamento, "rascunho">,
  { rotulo: string; icone: LucideIcon; confirmar?: string }
> = {
  enviado: { rotulo: "Marcar como enviado", icone: Send },
  aprovado: {
    rotulo: "Marcar como aprovado",
    icone: Check,
    confirmar:
      "Depois de aprovado, o orçamento não poderá mais ser editado (só duplicado). Deseja continuar?",
  },
  recusado: {
    rotulo: "Marcar como recusado",
    icone: X,
    confirmar:
      "Depois de recusado, o orçamento não poderá mais ser editado (só duplicado). Deseja continuar?",
  },
};

type Props = {
  orcamento: { id: string; status: StatusOrcamento; numeroFormatado: string };
};

export function AcoesOrcamento({ orcamento }: Props) {
  const [resultado, setResultado] = useState<EstadoAcao | null>(null);
  const [duplicando, iniciarDuplicar] = useTransition();
  const [mudandoStatus, iniciarStatus] = useTransition();
  const editavel = orcamentoEditavel(orcamento.status);
  const proximos = proximosStatus(orcamento.status).filter(
    (s): s is Exclude<StatusOrcamento, "rascunho"> => s !== "rascunho",
  );

  const mudarStatus = (status: StatusOrcamento) =>
    iniciarStatus(async () =>
      setResultado(await alterarStatusOrcamento(orcamento.id, status)),
    );

  const duplicar = () =>
    iniciarDuplicar(async () => {
      // Em caso de sucesso, a action redireciona para a edição da cópia.
      const r = await duplicarOrcamento(orcamento.id);
      if (r) setResultado(r);
    });

  return (
    <div className="grid gap-3">
      {resultado && <MensagemFormulario estado={resultado} />}

      {proximos.length > 0 && (
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {proximos.map((status) => {
            const { rotulo, icone: Icone, confirmar } = ACAO_STATUS[status];
            const botao = (
              <Button
                type="button"
                variant={status === "recusado" ? "outline" : "secondary"}
                className={cn(
                  "h-11",
                  status === "aprovado" &&
                    "bg-emerald-600 text-white hover:bg-emerald-700 [&_svg]:text-white",
                )}
                disabled={mudandoStatus}
                onClick={confirmar ? undefined : () => mudarStatus(status)}
              >
                {mudandoStatus ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Icone aria-hidden />
                )}
                {rotulo}
              </Button>
            );
            return confirmar ? (
              <ConfirmarAcao
                key={status}
                gatilho={botao}
                titulo={`${rotulo}?`}
                descricao={confirmar}
                textoConfirmar={rotulo}
                aoConfirmar={() => alterarStatusOrcamento(orcamento.id, status)}
                aoConcluir={(r) => setResultado(r as EstadoAcao)}
              />
            ) : (
              <Fragment key={status}>{botao}</Fragment>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:flex">
        {editavel ? (
          <Link
            href={rotaEditarOrcamento(orcamento.id)}
            className={cn(buttonVariants({ variant: "outline" }), "h-11")}
          >
            <Pencil aria-hidden />
            Editar
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled
            title="Aprovados e recusados não podem ser editados"
          >
            <Pencil aria-hidden />
            Editar
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={duplicar}
          disabled={duplicando}
        >
          {duplicando ? <Loader2 className="animate-spin" /> : <Copy aria-hidden />}
          Duplicar
        </Button>

        <ConfirmarAcao
          gatilho={
            <Button type="button" variant="destructive" className="h-11">
              <Trash2 aria-hidden />
              Excluir
            </Button>
          }
          titulo={`Excluir o orçamento ${orcamento.numeroFormatado}?`}
          descricao="O orçamento e todos os seus itens serão apagados permanentemente. Essa ação não pode ser desfeita."
          textoConfirmar="Excluir orçamento"
          destrutivo
          aoConfirmar={() => excluirOrcamento(orcamento.id)}
        />
      </div>

      {!editavel && (
        <p className="text-sm text-muted-foreground">
          Orçamentos aprovados ou recusados não podem ser editados. Use
          &quot;Duplicar&quot; para criar um novo rascunho com os mesmos itens.
        </p>
      )}
    </div>
  );
}
