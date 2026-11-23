import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Agrupa campos de um formulário sob um título discreto. */
export function Secao({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-5", className)}>
      <legend className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}
