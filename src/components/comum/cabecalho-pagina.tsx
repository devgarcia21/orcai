import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Título da página com link de voltar e ações à direita (ou abaixo, no celular). */
export function CabecalhoPagina({
  titulo,
  descricao,
  voltar,
  acoes,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  voltar?: { href: string; rotulo: string };
  acoes?: ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:flex sm:items-end sm:justify-between">
      <div className="min-w-0">
        {voltar && (
          <Link
            href={voltar.href}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {voltar.rotulo}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{titulo}</h1>
        {descricao && <div className="mt-1 text-muted-foreground">{descricao}</div>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
