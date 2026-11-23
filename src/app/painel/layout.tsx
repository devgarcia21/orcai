import { Suspense } from "react";

import { CabecalhoPainel } from "@/components/painel/cabecalho-painel";
import { ConteudoCarregando } from "@/components/painel/carregando";
import { NavegacaoInferior } from "@/components/painel/navegacao";

export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <CabecalhoPainel />
      {/* pb extra no celular para o conteúdo não ficar atrás da barra inferior */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pt-10 md:pb-12">
        <Suspense fallback={<ConteudoCarregando />}>{children}</Suspense>
      </main>
      <NavegacaoInferior />
    </div>
  );
}
