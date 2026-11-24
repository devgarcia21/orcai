import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { BlocoPagamentoPix } from "@/components/pix/bloco-pagamento-pix";
import { Card, CardContent } from "@/components/ui/card";
import { formatarDataHora } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import type { PixOrcamento } from "@/lib/pix/orcamento";
import { ROTAS } from "@/lib/rotas";

import { AcoesSinal } from "./acoes-sinal";

/**
 * Painel, orçamento aprovado: situação do sinal + QR Code / Pix Copia e Cola
 * para reenviar ao cliente + marcar/desfazer o recebimento.
 */
export function PagamentoSinal({
  orcamentoId,
  pix,
  sinalRecebidoEm,
}: {
  orcamentoId: string;
  pix: PixOrcamento;
  sinalRecebidoEm: string | null;
}) {
  const valor = pix.disponivel ? formatarMoeda(pix.valorCentavos) : null;

  if (sinalRecebidoEm) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-emerald-900">
            <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Sinal recebido{valor ? ` · ${valor}` : ""}</p>
              <p className="text-sm">Marcado em {formatarDataHora(sinalRecebidoEm)}</p>
            </div>
          </div>
          <AcoesSinal orcamentoId={orcamentoId} recebido valor={valor} />
        </CardContent>
      </Card>
    );
  }

  if (!pix.disponivel) {
    return (
      <Card>
        <CardContent className="grid gap-3">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-amber-600"
              aria-hidden
            />
            <div className="text-sm">
              <p className="font-semibold">Não foi possível gerar o QR Code PIX</p>
              <p className="text-muted-foreground">
                {pix.motivo}{" "}
                <Link
                  href={ROTAS.perfil}
                  className="font-medium text-primary hover:underline"
                >
                  Abrir o Perfil
                </Link>
              </p>
            </div>
          </div>
          <AcoesSinal orcamentoId={orcamentoId} recebido={false} valor={null} />
        </CardContent>
      </Card>
    );
  }

  return (
    <BlocoPagamentoPix pix={pix} titulo="Pagamento do sinal">
      <p className="text-xs text-muted-foreground">
        Aguardando pagamento. Se precisar, envie o código acima de novo ao cliente. O QR
        Code é estático: confira o extrato e confirme aqui quando o dinheiro cair.
      </p>
      <AcoesSinal orcamentoId={orcamentoId} recebido={false} valor={valor} />
    </BlocoPagamentoPix>
  );
}
