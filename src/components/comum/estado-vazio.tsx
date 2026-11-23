import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mensagem amigável para listas sem itens, com uma ação opcional. */
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icone className="size-6" aria-hidden />
      </span>
      <h2 className="font-semibold">{titulo}</h2>
      {descricao && (
        <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
          {descricao}
        </p>
      )}
      {acao && <div className="mt-5 w-full max-w-xs sm:w-auto">{acao}</div>}
    </div>
  );
}
