import { Check, Eye, FilePlus2, Send, X, type LucideIcon } from "lucide-react";

import { formatarDataHora } from "@/lib/datas";
import type { Orcamento } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Etapa = {
  titulo: string;
  quando: string | null;
  icone: LucideIcon;
  /** Texto quando a etapa ainda não aconteceu. */
  pendente: string;
  detalhe?: string | null;
  tom?: "sucesso" | "perigo";
};

type Props = Pick<
  Orcamento,
  | "status"
  | "created_at"
  | "enviado_em"
  | "visualizado_em"
  | "respondido_em"
  | "motivo_recusa"
>;

/** Criado → Enviado → Visualizado pelo cliente → Aprovado/Recusado, com data e hora. */
export function LinhaDoTempo(o: Props) {
  const recusado = o.status === "recusado";
  const etapas: Etapa[] = [
    { titulo: "Criado", quando: o.created_at, icone: FilePlus2, pendente: "" },
    {
      titulo: "Enviado",
      quando: o.enviado_em,
      icone: Send,
      pendente: "Ainda não enviado",
    },
    {
      titulo: "Visualizado pelo cliente",
      quando: o.visualizado_em,
      icone: Eye,
      pendente: o.enviado_em ? "O cliente ainda não abriu o link" : "Aguardando envio",
    },
    {
      titulo: recusado ? "Recusado" : "Aprovado",
      quando: o.status === "aprovado" || recusado ? o.respondido_em : null,
      icone: recusado ? X : Check,
      pendente: "Aguardando resposta do cliente",
      detalhe: recusado && o.motivo_recusa ? `Motivo: “${o.motivo_recusa}”` : null,
      tom: recusado ? "perigo" : "sucesso",
    },
  ];

  return (
    <ol className="grid gap-0">
      {etapas.map((etapa, i) => {
        const feito = Boolean(etapa.quando);
        const Icone = etapa.icone;
        const ultima = i === etapas.length - 1;
        return (
          <li key={etapa.titulo} className="relative flex gap-3 pb-5 last:pb-0">
            {/* trilho vertical entre as etapas */}
            {!ultima && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 bottom-0 left-[15px] w-px",
                  feito ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-full border",
                !feito && "border-dashed bg-background text-muted-foreground",
                feito && !etapa.tom && "border-primary/30 bg-primary/10 text-primary",
                feito &&
                  etapa.tom === "sucesso" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-700",
                feito &&
                  etapa.tom === "perigo" &&
                  "border-red-200 bg-red-50 text-red-700",
              )}
            >
              <Icone className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn("text-sm font-medium", !feito && "text-muted-foreground")}>
                {etapa.titulo}
              </p>
              <p className="text-xs text-muted-foreground">
                {etapa.quando ? formatarDataHora(etapa.quando) : etapa.pendente}
              </p>
              {etapa.detalhe && (
                <p className="mt-1 text-sm break-words whitespace-pre-line">
                  {etapa.detalhe}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
