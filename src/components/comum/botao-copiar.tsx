"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { copiarTexto } from "@/lib/copiar";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  texto: string;
  rotulo: string;
  rotuloCopiado?: string;
};

/** Botão que copia um texto e confirma com "Copiado" por alguns segundos. */
export function BotaoCopiar({
  texto,
  rotulo,
  rotuloCopiado = "Copiado!",
  className,
  ...props
}: Props) {
  const [estado, setEstado] = useState<"inicial" | "copiado" | "falhou">("inicial");

  useEffect(() => {
    if (estado === "inicial") return;
    const t = setTimeout(() => setEstado("inicial"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("h-11", className)}
        onClick={async () => setEstado((await copiarTexto(texto)) ? "copiado" : "falhou")}
        {...props}
      >
        {estado === "copiado" ? (
          <Check aria-hidden className="text-emerald-600" />
        ) : (
          <Copy aria-hidden />
        )}
        {estado === "copiado" ? rotuloCopiado : rotulo}
      </Button>
      {/* Anúncio para leitores de tela */}
      <span className="sr-only" aria-live="polite">
        {estado === "copiado"
          ? rotuloCopiado
          : estado === "falhou"
            ? "Não foi possível copiar"
            : ""}
      </span>
    </>
  );
}
