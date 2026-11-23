import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { CLASSE_CONTROLE } from "./campo";

/**
 * <select> nativo com o visual dos inputs. No celular, o seletor nativo do
 * sistema é mais rápido e acessível do que um dropdown customizado.
 */
export function SelectNativo({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        CLASSE_CONTROLE,
        "w-full rounded-lg border border-input bg-background px-2.5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
