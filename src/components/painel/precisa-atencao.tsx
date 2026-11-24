import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CircleCheckBig,
  Hourglass,
  MessageCircle,
  Send,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData } from "@/lib/datas";
import type { GrupoAtencao, ItemAtencao, PainelMetricas } from "@/lib/metricas/calcular";
import { formatarMoeda } from "@/lib/moeda";
import { formatarNumeroOrcamento } from "@/lib/orcamento/regras";
import { rotaOrcamento, ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

type Atencao = PainelMetricas["atencao"];

function Grupo<T extends ItemAtencao>({
  titulo,
  icone: Icone,
  grupo,
  info,
  acao,
}: {
  titulo: string;
  icone: LucideIcon;
  grupo: GrupoAtencao<T>;
  /** Linha de detalhe do item ("Enviado há 5 dias"). */
  info: (item: T) => string;
  acao?: (item: T) => React.ReactNode;
}) {
  if (grupo.total === 0) return null;
  const restantes = grupo.total - grupo.itens.length;

  return (
    <Card size="sm">
      <CardContent className="grid gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icone className="size-4 text-amber-600" aria-hidden />
          {titulo}
          <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-900 tabular-nums dark:bg-amber-950 dark:text-amber-200">
            {grupo.total}
          </span>
        </h3>
        <ul className="grid divide-y">
          {grupo.itens.map((item) => (
            <li key={item.id} className="grid gap-2 py-2.5 first:pt-0 last:pb-0">
              <Link
                href={rotaOrcamento(item.id)}
                className="group min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <p className="truncate text-sm font-medium group-hover:underline">
                  <span className="text-muted-foreground tabular-nums">
                    {formatarNumeroOrcamento(item.numero)}
                  </span>{" "}
                  {item.titulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.cliente_nome} · {info(item)}
                </p>
              </Link>
              {acao?.(item)}
            </li>
          ))}
        </ul>
        {restantes > 0 && (
          <Link
            href={ROTAS.orcamentos}
            className="text-xs font-medium text-primary hover:underline"
          >
            e mais {restantes} na lista de orçamentos
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

function quandoVence(diasParaVencer: number, validoAte: string) {
  if (diasParaVencer === 0) return "vence hoje";
  if (diasParaVencer === 1) return "vence amanhã";
  return `vence em ${formatarData(validoAte)}`;
}

/**
 * "Precisa da sua atenção": até 5 itens por grupo, com link para o orçamento.
 * `lembretes` = link do WhatsApp por orçamento (montado no servidor).
 */
export function PrecisaAtencao({
  atencao,
  lembretes,
}: {
  atencao: Atencao;
  lembretes: Record<string, string>;
}) {
  const vazio =
    atencao.semResposta.total + atencao.vencendo.total + atencao.aguardandoSinal.total ===
    0;

  return (
    <section className="grid gap-3" aria-labelledby="titulo-atencao">
      <h2 id="titulo-atencao" className="font-semibold">
        Precisa da sua atenção
      </h2>
      {vazio ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-4 text-sm text-muted-foreground">
          <CircleCheckBig className="size-5 shrink-0 text-emerald-600" aria-hidden />
          Tudo em dia: nenhum orçamento parado, vencendo ou esperando o sinal.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3 lg:items-start">
          <Grupo
            titulo="Sem resposta há mais de 3 dias"
            icone={Send}
            grupo={atencao.semResposta}
            info={(item) => `enviado há ${dias(item.diasSemResposta)}`}
            acao={(item) =>
              lembretes[item.id] ? (
                <a
                  href={lembretes[item.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-10 w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300",
                  )}
                  aria-label={`Lembrar ${item.cliente_nome} pelo WhatsApp sobre o orçamento ${formatarNumeroOrcamento(item.numero)}`}
                >
                  <MessageCircle aria-hidden />
                  Lembrar pelo WhatsApp
                </a>
              ) : null
            }
          />
          <Grupo
            titulo="Vencem nos próximos 3 dias"
            icone={CalendarClock}
            grupo={atencao.vencendo}
            info={(item) =>
              `${quandoVence(item.diasParaVencer, item.valido_ate)} · ${formatarMoeda(item.valor)}`
            }
          />
          <Grupo
            titulo="Aprovados aguardando o sinal"
            icone={Hourglass}
            grupo={atencao.aguardandoSinal}
            info={(item) =>
              `sinal de ${formatarMoeda(item.valor)} · aprovado em ${formatarData(item.aprovadoEm)}`
            }
          />
        </div>
      )}
    </section>
  );
}
