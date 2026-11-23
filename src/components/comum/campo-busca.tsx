"use client";

import { Search, X } from "lucide-react";

import { CLASSE_CONTROLE } from "@/components/formulario/campo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Campo de busca com ícone e botão para limpar. */
export function CampoBusca({
  valor,
  aoMudar,
  placeholder,
  rotulo,
  className,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
  rotulo: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        aria-label={rotulo}
        className={cn(
          CLASSE_CONTROLE,
          "bg-background pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {valor && (
        <button
          type="button"
          onClick={() => aoMudar("")}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
