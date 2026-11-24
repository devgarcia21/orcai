import { QrCode as IconeQr } from "lucide-react";

import { BotaoCopiar } from "@/components/comum/botao-copiar";
import { Card, CardContent } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/moeda";
import type { PixOrcamento } from "@/lib/pix/orcamento";

import { QrCode } from "./qr-code";

type Props = {
  pix: Extract<PixOrcamento, { disponivel: true }>;
  titulo?: string;
  /** Conteúdo extra no rodapé do bloco (ex.: ações do prestador no painel). */
  children?: React.ReactNode;
};

/**
 * "Pague o sinal via PIX": valor, QR Code e Pix Copia e Cola.
 * Usado na página do cliente (após aprovar) e no painel do prestador.
 */
export function BlocoPagamentoPix({
  pix,
  titulo = "Pague o sinal via PIX",
  children,
}: Props) {
  return (
    <Card className="border-primary/40">
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <IconeQr className="size-5 text-primary" aria-hidden />
          <h2 className="font-semibold">{titulo}</h2>
        </div>

        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary">
          <span className="text-sm font-medium">{pix.rotulo}</span>
          <span className="text-xl font-semibold tabular-nums">
            {formatarMoeda(pix.valorCentavos)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código.
        </p>

        <div className="mx-auto w-full max-w-60 rounded-xl border p-2">
          <QrCode
            conteudo={pix.payload}
            rotulo={`QR Code PIX de ${formatarMoeda(pix.valorCentavos)}`}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="pix-copia-e-cola" className="text-xs text-muted-foreground">
            Pix Copia e Cola
          </label>
          <textarea
            id="pix-copia-e-cola"
            readOnly
            rows={5} // o código tem ~150 caracteres: cabe inteiro no celular
            value={pix.payload}
            className="w-full resize-none rounded-lg border bg-muted/40 p-2 font-mono text-xs break-all"
          />
          <BotaoCopiar
            texto={pix.payload}
            rotulo="Copiar código PIX"
            rotuloCopiado="Código copiado"
            className="w-full"
          />
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
