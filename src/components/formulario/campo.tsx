import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CampoBaseProps = {
  id: string;
  rotulo: string;
  erros?: string[];
  dica?: ReactNode;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
};

/**
 * Estrutura comum de um campo: rótulo, controle, dica e mensagem de erro,
 * já ligados por id/aria para leitores de tela.
 */
export function CampoBase({
  id,
  rotulo,
  erros,
  dica,
  className,
  children,
}: CampoBaseProps) {
  const erro = erros?.[0];
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const describedBy = [idDica, idErro].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children({ id, "aria-invalid": Boolean(erro), "aria-describedby": describedBy })}
      {dica && !erro && (
        <p id={idDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Classes de altura/tamanho confortáveis para toque no celular. */
export const CLASSE_CONTROLE = "h-11 text-base md:text-sm";

type CampoProps = Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  rotulo: string;
  erros?: string[];
  dica?: ReactNode;
};

/** Campo de texto padrão (Label + Input + erro). */
export function Campo({ id, rotulo, erros, dica, className, ...inputProps }: CampoProps) {
  return (
    <CampoBase id={id} rotulo={rotulo} erros={erros} dica={dica}>
      {(aria) => (
        <Input
          name={id}
          {...aria}
          {...inputProps}
          className={cn(CLASSE_CONTROLE, className)}
        />
      )}
    </CampoBase>
  );
}
