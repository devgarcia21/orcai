import type { Metadata } from "next";
import Link from "next/link";

import { ROTAS } from "@/lib/rotas";

// Links de orçamento são privados de quem recebe: nunca indexar.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/** Área pública (cliente, sem login). Sem a navegação do painel. */
export default function PublicoLayout({ children }: LayoutProps<"/o">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-10 sm:pt-10">
        {children}
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground">
        Orçamento criado com{" "}
        <Link href={ROTAS.inicio} className="font-medium text-foreground hover:underline">
          Orça<span className="text-primary">í</span>
        </Link>
      </footer>
    </div>
  );
}
