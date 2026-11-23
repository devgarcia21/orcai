"use client";

import { ImageUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CampoBase } from "@/components/formulario/campo";
import { Button } from "@/components/ui/button";
import { LOGO_TIPOS_ACEITOS, validarLogo } from "@/lib/validacoes/perfil";

type Props = {
  logoAtual: string | null;
  erros?: string[];
};

/**
 * Seletor de logo com pré-visualização. O arquivo segue no próprio formulário
 * (campo "logo") e é validado aqui e de novo no servidor.
 */
export function CampoLogo({ logoAtual, erros }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  // Libera a memória da URL temporária ao trocar de imagem ou sair da página.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    setErroLocal(null);
    setPreview(null);
    if (!arquivo) return;

    const problema = validarLogo(arquivo);
    if (problema) {
      setErroLocal(problema);
      evento.target.value = ""; // não envia um arquivo inválido
      return;
    }
    setPreview(URL.createObjectURL(arquivo));
  }

  const imagem = preview ?? logoAtual;

  return (
    <CampoBase
      id="logo"
      rotulo="Logo da empresa"
      erros={erroLocal ? [erroLocal] : erros}
      dica="PNG ou JPG, até 2 MB. Aparecerá nos seus orçamentos."
    >
      {(aria) => (
        <div className="flex items-center gap-4">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/50">
            {imagem ? (
              <Image
                src={imagem}
                alt={preview ? "Pré-visualização da nova logo" : "Logo atual"}
                fill
                sizes="80px"
                className="object-contain p-1"
                unoptimized={Boolean(preview)}
              />
            ) : (
              <ImageUp className="size-7 text-muted-foreground" aria-hidden />
            )}
          </div>

          <div className="grid gap-1">
            <input
              ref={inputRef}
              type="file"
              name="logo"
              accept={LOGO_TIPOS_ACEITOS.join(",")}
              className="sr-only"
              onChange={aoEscolher}
              {...aria}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => inputRef.current?.click()}
            >
              {imagem ? "Trocar logo" : "Enviar logo"}
            </Button>
            {preview && (
              <span className="text-xs text-muted-foreground">
                Nova logo selecionada. Salve para aplicar.
              </span>
            )}
          </div>
        </div>
      )}
    </CampoBase>
  );
}
