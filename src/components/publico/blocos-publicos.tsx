import { CircleCheck, CircleX, Clock, QrCode } from "lucide-react";
import Image from "next/image";

import { BotaoCopiar } from "@/components/comum/botao-copiar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarChavePix } from "@/lib/formatacao";
import { formatarMoeda } from "@/lib/moeda";
import { OPCOES_CHAVE_PIX } from "@/lib/pix";
import { nomeDeExibicao } from "@/lib/prestador";
import type { OrcamentoPublico, PrestadorPublico } from "@/lib/types/database";

/** Logo + nome do prestador no topo da página do cliente. */
export function CabecalhoPrestador({ prestador }: { prestador: PrestadorPublico }) {
  return (
    <div className="flex items-center gap-3">
      {prestador.logo_url ? (
        <Image
          src={prestador.logo_url}
          alt={`Logo de ${nomeDeExibicao(prestador)}`}
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-lg border bg-white object-contain p-1"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary uppercase">
          {nomeDeExibicao(prestador).charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{nomeDeExibicao(prestador)}</p>
        {prestador.cidade && (
          <p className="text-sm text-muted-foreground">{prestador.cidade}</p>
        )}
      </div>
    </div>
  );
}

/** Aviso de status para orçamentos que não podem mais ser respondidos. */
export function StatusPublico({
  orcamento,
}: {
  orcamento: Pick<
    OrcamentoPublico,
    "status" | "respondido_em" | "vencido" | "valido_ate"
  >;
}) {
  if (orcamento.status === "aprovado") {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 *:data-[slot=alert-description]:text-emerald-900">
        <CircleCheck />
        <AlertTitle>Orçamento aprovado</AlertTitle>
        {orcamento.respondido_em && (
          <AlertDescription>
            Aprovado em {formatarDataHora(orcamento.respondido_em)}.
          </AlertDescription>
        )}
      </Alert>
    );
  }
  if (orcamento.status === "recusado") {
    return (
      <Alert>
        <CircleX />
        <AlertTitle>Orçamento recusado</AlertTitle>
        {orcamento.respondido_em && (
          <AlertDescription>
            Recusado em {formatarDataHora(orcamento.respondido_em)}.
          </AlertDescription>
        )}
      </Alert>
    );
  }
  if (orcamento.vencido && orcamento.valido_ate) {
    return (
      <Alert className="border-amber-300 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900">
        <Clock />
        <AlertTitle>Orçamento vencido</AlertTitle>
        <AlertDescription>
          A validade terminou em {formatarData(orcamento.valido_ate)}. Fale com o
          prestador para pedir um orçamento atualizado.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

/** Chave PIX com botão de copiar (o QR Code chega na próxima etapa). */
export function BlocoPix({
  prestador,
  valorSinal,
  percentualSinal,
}: {
  prestador: PrestadorPublico;
  valorSinal: number;
  percentualSinal: number;
}) {
  if (!prestador.tipo_chave_pix || !prestador.chave_pix) return null;
  return (
    <Card className="border-primary/30">
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2">
          <QrCode className="size-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Pagamento via PIX</h2>
        </div>
        {percentualSinal > 0 && (
          <p className="text-sm text-muted-foreground">
            Sinal de {percentualSinal}%:{" "}
            <span className="font-semibold text-foreground">
              {formatarMoeda(valorSinal)}
            </span>
          </p>
        )}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Chave PIX ({OPCOES_CHAVE_PIX[prestador.tipo_chave_pix].rotulo})
          </p>
          <p className="font-medium break-all">
            {formatarChavePix(prestador.tipo_chave_pix, prestador.chave_pix)}
          </p>
        </div>
        <BotaoCopiar
          texto={prestador.chave_pix}
          rotulo="Copiar chave PIX"
          rotuloCopiado="Chave copiada!"
          className="w-full sm:w-auto"
        />
      </CardContent>
    </Card>
  );
}

/** Esqueleto da página do cliente (mesmo formato do conteúdo). */
export function EsqueletoPublico() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-lg" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
