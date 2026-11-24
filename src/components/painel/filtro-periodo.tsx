import Link from "next/link";

import {
  PERIODO_PADRAO,
  PERIODOS,
  ROTULOS_PERIODO,
  ROTULOS_PERIODO_CURTOS,
  type ChavePeriodo,
} from "@/lib/metricas/periodo";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

/** Link do período: o padrão (30 dias) fica sem parâmetro, o resto usa ?periodo=. */
export const hrefPeriodo = (periodo: ChavePeriodo) =>
  periodo === PERIODO_PADRAO ? ROTAS.painel : `${ROTAS.painel}?periodo=${periodo}`;

/**
 * Filtro de período: links comuns (o período fica na URL — dá para compartilhar
 * e o botão voltar funciona). `atual` null = ainda carregando (nada marcado).
 */
export function FiltroPeriodo({ atual }: { atual: ChavePeriodo | null }) {
  return (
    <nav
      aria-label="Período das métricas"
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {PERIODOS.map((periodo) => {
        const ativo = periodo === atual;
        return (
          <Link
            key={periodo}
            href={hrefPeriodo(periodo)}
            scroll={false}
            aria-current={ativo ? "page" : undefined}
            aria-label={ROTULOS_PERIODO[periodo]}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted",
              ativo &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <span className="sm:hidden">{ROTULOS_PERIODO_CURTOS[periodo]}</span>
            <span className="hidden sm:inline">{ROTULOS_PERIODO[periodo]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
