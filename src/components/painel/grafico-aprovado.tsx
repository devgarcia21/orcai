import { Card, CardContent } from "@/components/ui/card";
import type { PainelMetricas } from "@/lib/metricas/calcular";
import { rotuloMes, rotuloMesLongo } from "@/lib/metricas/formatar";
import { formatarMoeda, formatarMoedaCompacta } from "@/lib/moeda";
import { cn } from "@/lib/utils";

/**
 * Valor aprovado por mês (6 meses). Barras em HTML/CSS — leve, sem biblioteca,
 * nítido em qualquer tela. O desenho fica escondido dos leitores de tela, que
 * recebem uma tabela com os mesmos números.
 */
export function GraficoAprovado({ meses }: { meses: PainelMetricas["meses"] }) {
  const maximo = Math.max(...meses.map((m) => m.valor), 0);
  const totalSemestre = meses.reduce((soma, m) => soma + m.valor, 0);

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div>
          <h2 id="titulo-grafico" className="font-semibold">
            Valor aprovado por mês
          </h2>
          <p className="text-sm text-muted-foreground">
            Últimos 6 meses · {formatarMoeda(totalSemestre)} no total
          </p>
        </div>

        <figure aria-labelledby="titulo-grafico" className="m-0">
          {/* pt-6: espaço para o rótulo da barra mais alta */}
          <div aria-hidden className="flex h-52 gap-2 border-b pt-6 sm:gap-4">
            {meses.map((m, i) => {
              const atual = i === meses.length - 1;
              const altura = maximo
                ? Math.max((m.valor / maximo) * 100, m.valor ? 3 : 0)
                : 0;
              return (
                <div key={m.mes} className="relative h-full min-w-0 flex-1">
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-t-md",
                      atual ? "bg-primary" : "bg-primary/35",
                    )}
                    style={{ height: `${altura}%` }}
                  />
                  {/* Rótulo logo acima da barra */}
                  <span
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 text-center text-[10px] font-medium whitespace-nowrap tabular-nums sm:text-xs",
                      m.valor ? "text-foreground" : "text-muted-foreground",
                    )}
                    style={{ bottom: `calc(${altura}% + 4px)` }}
                  >
                    {formatarMoedaCompacta(m.valor)}
                  </span>
                </div>
              );
            })}
          </div>
          <div aria-hidden className="mt-2 flex gap-2 sm:gap-4">
            {meses.map((m, i) => (
              <span
                key={m.mes}
                className={cn(
                  "flex-1 text-center text-xs capitalize",
                  i === meses.length - 1 ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {rotuloMes(m.mes)}
              </span>
            ))}
          </div>

          <table className="sr-only">
            <caption>Valor aprovado por mês nos últimos 6 meses</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Valor aprovado</th>
                <th scope="col">Orçamentos aprovados</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes}>
                  <th scope="row">{rotuloMesLongo(m.mes)}</th>
                  <td>{formatarMoeda(m.valor)}</td>
                  <td>{m.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </CardContent>
    </Card>
  );
}
