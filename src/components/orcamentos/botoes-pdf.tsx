import { Download, FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { rotaPdfOrcamento } from "@/lib/rotas";
import { cn } from "@/lib/utils";

/**
 * "Ver PDF" abre em nova aba; "Baixar PDF" força o download.
 * São <a> comuns (não <Link>): o destino é um Route Handler que devolve o arquivo.
 */
export function BotoesPdf({ orcamentoId }: { orcamentoId: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <a
        href={rotaPdfOrcamento(orcamentoId)}
        target="_blank"
        rel="noopener"
        className={cn(buttonVariants({ size: "lg" }), "h-11 px-4")}
      >
        <FileText aria-hidden />
        Ver PDF
      </a>
      <a
        href={rotaPdfOrcamento(orcamentoId, true)}
        download
        className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-4")}
      >
        <Download aria-hidden />
        Baixar PDF
      </a>
    </div>
  );
}
