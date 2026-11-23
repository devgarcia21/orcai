"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";

type Acao<T> = (anterior: EstadoAcao<T>, formData: FormData) => Promise<EstadoAcao<T>>;

/**
 * Liga um <form> a uma Server Action com estado de carregamento e resultado.
 *
 * Usamos onSubmit (em vez de action={...}) para que o React não limpe os
 * campos após o envio: se der erro, a pessoa não perde o que digitou.
 */
export function useAcaoFormulario<T = undefined>(acao: Acao<T>) {
  const [estado, executar, enviando] = useActionState(
    acao,
    ESTADO_INICIAL as EstadoAcao<T>,
  );

  function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Formulários dentro de diálogos não devem enviar o formulário "de fora".
    evento.stopPropagation();
    const formData = new FormData(evento.currentTarget);
    startTransition(() => executar(formData));
  }

  return { estado, enviando, onSubmit };
}
