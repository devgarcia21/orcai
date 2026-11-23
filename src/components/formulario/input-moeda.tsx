"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { centavosDaMascara, formatarMoeda } from "@/lib/moeda";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  centavos: number;
  aoMudar: (centavos: number) => void;
};

/**
 * Input de dinheiro com máscara de reais. O valor do componente é sempre em
 * centavos; o texto exibido é só apresentação. Os dígitos entram pela direita,
 * como numa maquininha: digitar 1, 5, 0, 0 mostra R$ 15,00.
 */
export function InputMoeda({ centavos, aoMudar, ...props }: Props) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatarMoeda(centavos)}
      onChange={(e) => aoMudar(centavosDaMascara(e.target.value))}
      onFocus={(e) => {
        // Cursor no fim, onde os dígitos entram.
        const alvo = e.currentTarget;
        requestAnimationFrame(() =>
          alvo.setSelectionRange(alvo.value.length, alvo.value.length),
        );
      }}
      {...props}
    />
  );
}
