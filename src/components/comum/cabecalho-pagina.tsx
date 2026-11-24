import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Link "← Voltar". Exportado separado para ficar na casca estática das
 * páginas de detalhe, enquanto o título (que depende dos dados) carrega.
 */
export function LinkVoltar({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {rotulo}
    </Link>
  );
}

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
      <div className="grid min-w-0 gap-3">
        {voltar && <LinkVoltar {...voltar} />}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{titulo}</h1>
          {descricao && <div className="mt-1 text-muted-foreground">{descricao}</div>}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
