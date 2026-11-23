import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BotaoEnviarProps = ComponentProps<typeof Button> & {
  enviando: boolean;
  textoEnviando?: string;
};

export function BotaoEnviar({
  enviando,
  textoEnviando = "Enviando...",
  children,
  className,
  disabled,
  ...props
}: BotaoEnviarProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={enviando || disabled}
      aria-busy={enviando}
      className={cn("h-11 w-full text-base", className)}
      {...props}
    >
      {enviando ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {textoEnviando}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
