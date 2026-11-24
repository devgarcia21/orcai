"use client";

import { Check, Copy, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { prepararEnvioOrcamento } from "@/actions/envio";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstadoAcao } from "@/lib/acoes";
import { copiarTexto } from "@/lib/copiar";
import type { DadosEnvio } from "@/lib/envio-orcamento";
import { cn } from "@/lib/utils";

type Props = {
  orcamentoId: string;
  /** Já existe link (orçamento enviado antes): tudo funciona direto no clique. */
  envio: DadosEnvio | null;
  rascunho: boolean;
};

const CLASSE_WHATSAPP =
  "h-11 bg-[#1f9d55] text-white hover:bg-[#1a8a4a] [&_svg]:text-white";

/**
 * "Enviar pelo WhatsApp" e "Copiar link".
 * No primeiro envio, o servidor gera o link e muda o status para "enviado".
 */
export function BotoesEnvio({ orcamentoId, envio, rascunho }: Props) {
  const [preparando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<EstadoAcao<DadosEnvio> | null>(null);
  const [copiado, setCopiado] = useState(false);
  /** Se copiar falhar (ex.: Safari após espera), mostramos o link para copiar à mão. */
  const [linkManual, setLinkManual] = useState<string | null>(null);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar(link: string) {
    const ok = await copiarTexto(link);
    setCopiado(ok);
    setLinkManual(ok ? null : link);
  }

  function prepararEntao(depois: (dados: DadosEnvio) => void, aoFalhar?: () => void) {
    iniciar(async () => {
      const r = await prepararEnvioOrcamento(orcamentoId);
      if (r.status === "sucesso" && r.dados) {
        setResultado(null);
        depois(r.dados);
      } else {
        setResultado(r);
        aoFalhar?.();
      }
    });
  }

  function enviarPrimeiraVez() {
    // Abre a aba já no clique (senão o navegador bloqueia como pop-up) e
    // só depois aponta para o WhatsApp, quando o link estiver pronto.
    const janela = window.open("", "_blank");
    if (janela) janela.opener = null;
    prepararEntao(
      ({ whatsapp }) => {
        if (janela) janela.location.href = whatsapp;
        else window.location.href = whatsapp;
      },
      () => janela?.close(),
    );
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-1 gap-2 sm:flex">
        {envio ? (
          <a
            href={envio.whatsapp}
            target="_blank"
            rel="noopener"
            className={cn(buttonVariants({ size: "lg" }), CLASSE_WHATSAPP, "px-4")}
          >
            <MessageCircle aria-hidden />
            Enviar pelo WhatsApp
          </a>
        ) : (
          <Button
            type="button"
            size="lg"
            className={cn(CLASSE_WHATSAPP, "px-4")}
            onClick={enviarPrimeiraVez}
            disabled={preparando}
          >
            {preparando ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MessageCircle aria-hidden />
            )}
            Enviar pelo WhatsApp
          </Button>
        )}

        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 px-4"
          disabled={preparando}
          onClick={() =>
            envio ? copiar(envio.link) : prepararEntao(({ link }) => copiar(link))
          }
        >
          {copiado ? (
            <Check aria-hidden className="text-emerald-600" />
          ) : preparando ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Copy aria-hidden />
          )}
          {copiado ? "Link copiado" : "Copiar link"}
        </Button>
      </div>

      <span className="sr-only" aria-live="polite">
        {copiado ? "Link copiado" : ""}
      </span>

      {rascunho && (
        <p className="text-xs text-muted-foreground">
          Ao enviar ou copiar o link, o orçamento passa de rascunho para enviado.
        </p>
      )}

      {linkManual && (
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">Copie o link abaixo:</p>
          <Input
            readOnly
            value={linkManual}
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 text-base md:text-sm"
            aria-label="Link do orçamento"
          />
        </div>
      )}

      {resultado && <MensagemFormulario estado={resultado} />}
    </div>
  );
}
