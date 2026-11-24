"use client";

import { useEffect, useRef } from "react";

import { registrarVisualizacao } from "@/actions/publico";

/**
 * Avisa o servidor que o CLIENTE abriu o link. Roda só no navegador (depois
 * de carregar), então robôs de prévia de link — que não executam JavaScript —
 * não marcam o orçamento como visualizado.
 */
export function RegistrarVisualizacao({ token }: { token: string }) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return; // StrictMode roda efeitos duas vezes no dev
    enviado.current = true;
    void registrarVisualizacao(token);
  }, [token]);
  return null;
}
