"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { Button } from "@/components/ui/button";

/** Erro inesperado ao carregar uma página do painel (ex.: falha de conexão). */
export default function ErroPainel({ retry }: { error: unknown; retry: () => void }) {
  return (
    <EstadoVazio
      icone={TriangleAlert}
      titulo="Algo deu errado ao carregar esta página"
      descricao="Verifique sua conexão com a internet e tente de novo. Se continuar, recarregue a página."
      acao={
        <Button size="lg" className="h-11 w-full" onClick={() => retry()}>
          <RotateCw aria-hidden />
          Tentar de novo
        </Button>
      }
    />
  );
}
