import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleCheckBig,
  Clock,
  Hourglass,
  Minus,
  Percent,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { PainelMetricas } from "@/lib/metricas/calcular";
import {
  direcao,
  formatarPercentual,
  textoComparacao,
  textoComparacaoTaxa,
} from "@/lib/metricas/formatar";
import type { Periodo } from "@/lib/metricas/periodo";
import { formatarMoeda } from "@/lib/moeda";
import { cn } from "@/lib/utils";

/**
 * Como colorir a comparação: "positiva" = subir é bom (verde), cair é ruim
 * (vermelho); "neutra" = saldos que não são bons nem ruins por si (cinza).
 */
type Polaridade = "positiva" | "neutra";

type PropsCartao = {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  comparacao: string;
  direcao: "sobe" | "desce" | "igual";
  polaridade: Polaridade;
  detalhe?: string;
  className?: string;
};

function Cartao({
  titulo,
  valor,
  icone: Icone,
  comparacao,
  direcao: dir,
  polaridade,
  detalhe,
  className,
}: PropsCartao) {
  const Seta = dir === "sobe" ? ArrowUpRight : dir === "desce" ? ArrowDownRight : Minus;
  const cor =
    polaridade === "neutra" || dir === "igual"
      ? "text-muted-foreground"
      : dir === "sobe"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-red-700 dark:text-red-400";

  return (
    <Card size="sm" className={className}>
      <CardContent className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm text-muted-foreground">{titulo}</h3>
          <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        <p className={cn("flex items-start gap-1 text-xs font-medium", cor)}>
          <Seta className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{comparacao}</span>
        </p>
      </CardContent>
    </Card>
  );
}

const orcamentos = (n: number) => `${n} ${n === 1 ? "orçamento" : "orçamentos"}`;

/** Os 5 indicadores do período, com a comparação com o período anterior. */
export function Indicadores({
  indicadores: i,
  periodo,
}: {
  indicadores: PainelMetricas["indicadores"];
  periodo: Periodo;
}) {
  const taxa = i.taxaAprovacao;
  const respostas = taxa.aprovados + taxa.recusados;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Cartao
        className="col-span-2 lg:col-span-1"
        titulo="Valor aprovado"
        icone={CircleCheckBig}
        valor={formatarMoeda(i.valorAprovado.valor)}
        detalhe={orcamentos(i.valorAprovado.quantidade)}
        comparacao={textoComparacao(i.valorAprovado.comparacao, periodo.rotuloComparacao)}
        direcao={direcao(i.valorAprovado.comparacao)}
        polaridade="positiva"
      />
      <Cartao
        titulo="A receber"
        icone={Hourglass}
        valor={formatarMoeda(i.aReceber.valor)}
        detalhe={`Sinais de ${orcamentos(i.aReceber.quantidade)}`}
        comparacao={textoComparacao(i.aReceber.comparacao, periodo.rotuloComparacaoSaldo)}
        direcao={direcao(i.aReceber.comparacao)}
        polaridade="neutra"
      />
      <Cartao
        titulo="Sinais recebidos"
        icone={Banknote}
        valor={formatarMoeda(i.sinaisRecebidos.valor)}
        detalhe={orcamentos(i.sinaisRecebidos.quantidade)}
        comparacao={textoComparacao(
          i.sinaisRecebidos.comparacao,
          periodo.rotuloComparacao,
        )}
        direcao={direcao(i.sinaisRecebidos.comparacao)}
        polaridade="positiva"
      />
      <Cartao
        titulo="Taxa de aprovação"
        icone={Percent}
        valor={formatarPercentual(taxa.valor)}
        detalhe={
          respostas
            ? `${taxa.aprovados} de ${respostas} ${respostas === 1 ? "resposta" : "respostas"}`
            : "Nenhuma resposta no período"
        }
        comparacao={textoComparacaoTaxa(taxa.comparacao, periodo.rotuloComparacao)}
        direcao={direcao(taxa.comparacao)}
        polaridade="positiva"
      />
      <Cartao
        titulo="Aguardando resposta"
        icone={Clock}
        valor={String(i.aguardandoResposta.valor)}
        detalhe="Enviados e dentro da validade"
        comparacao={textoComparacao(
          i.aguardandoResposta.comparacao,
          periodo.rotuloComparacaoSaldo,
        )}
        direcao={direcao(i.aguardandoResposta.comparacao)}
        polaridade="neutra"
      />
    </div>
  );
}
