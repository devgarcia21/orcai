import { Card, CardContent } from "@/components/ui/card";
import type { PainelMetricas } from "@/lib/metricas/calcular";
import { formatarPercentual } from "@/lib/metricas/formatar";
import { cn } from "@/lib/utils";

const CORES = {
  criados: "bg-primary/30",
  enviados: "bg-primary/50",
  visualizados: "bg-primary/75",
  aprovados: "bg-emerald-600",
} as const;

/**
 * Funil dos orçamentos CRIADOS no período: até onde cada um chegou.
 * Lista semântica (leitores de tela leem "Enviados: 8, 80%"); as barras são decorativas.
 */
export function FunilPeriodo({
  funil,
  rotuloPeriodo,
}: {
  funil: PainelMetricas["funil"];
  rotuloPeriodo: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4">
        <div>
          <h2 className="font-semibold">Funil do período</h2>
          <p className="text-sm text-muted-foreground">
            Orçamentos criados · {rotuloPeriodo.toLowerCase()}
          </p>
        </div>
        <ol className="grid gap-3">
          {funil.map((etapa) => (
            <li key={etapa.etapa} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{etapa.rotulo}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{etapa.quantidade}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatarPercentual(etapa.percentual)}
                  </span>
                </span>
              </div>
              <div aria-hidden className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", CORES[etapa.etapa])}
                  style={{ width: `${etapa.percentual ?? 0}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
