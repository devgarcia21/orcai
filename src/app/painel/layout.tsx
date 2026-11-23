import { Suspense } from "react";

import { CabecalhoPainel } from "@/components/painel/cabecalho-painel";
import { ConteudoCarregando } from "@/components/painel/carregando";

export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <CabecalhoPainel />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <Suspense fallback={<ConteudoCarregando />}>{children}</Suspense>
      </main>
    </div>
  );
}
