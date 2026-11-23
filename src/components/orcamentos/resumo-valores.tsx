import { formatarMoeda } from "@/lib/moeda";
import type { ResumoOrcamento } from "@/lib/orcamento/calculos";
import { cn } from "@/lib/utils";

/** Subtotal, desconto, total e sinal — mesmo visual no formulário e na visualização. */
export function ResumoValores({
  resumo,
  compacto,
  className,
}: {
  resumo: ResumoOrcamento;
  /** Versão em 2 colunas para a barra fixa do celular. */
  compacto?: boolean;
  className?: string;
}) {
  const linhas = [
    { rotulo: "Subtotal", valor: formatarMoeda(resumo.subtotal) },
    {
      rotulo: "Desconto",
      valor:
        resumo.desconto > 0 ? `− ${formatarMoeda(resumo.desconto)}` : formatarMoeda(0),
    },
  ];

  if (compacto) {
    return (
      <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-1 text-xs", className)}>
        {linhas.map((l) => (
          <div
            key={l.rotulo}
            className="flex justify-between gap-2 text-muted-foreground"
          >
            <dt>{l.rotulo}</dt>
            <dd className="tabular-nums">{l.valor}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-2 text-sm font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatarMoeda(resumo.total)}</dd>
        </div>
        <div className="flex justify-between gap-2 text-sm font-semibold text-primary">
          <dt>Sinal {resumo.percentualSinal}%</dt>
          <dd className="tabular-nums">{formatarMoeda(resumo.sinal)}</dd>
        </div>
      </dl>
    );
  }

  return (
    <dl className={cn("grid gap-2 text-sm", className)}>
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex justify-between gap-4 text-muted-foreground">
          <dt>{l.rotulo}</dt>
          <dd className="tabular-nums">{l.valor}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="text-xl tabular-nums">{formatarMoeda(resumo.total)}</dd>
      </div>
      <div className="flex justify-between gap-4 rounded-lg bg-primary/10 px-3 py-2 font-medium text-primary">
        <dt>Sinal ({resumo.percentualSinal}%)</dt>
        <dd className="tabular-nums">{formatarMoeda(resumo.sinal)}</dd>
      </div>
    </dl>
  );
}
