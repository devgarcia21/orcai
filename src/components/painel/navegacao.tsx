"use client";

import { FileText, Home, User, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

type ItemNavegacao = { href: string; rotulo: string; icone: LucideIcon; exato?: boolean };

const ITENS: ItemNavegacao[] = [
  { href: ROTAS.painel, rotulo: "Início", icone: Home, exato: true },
  { href: ROTAS.orcamentos, rotulo: "Orçamentos", icone: FileText },
  { href: ROTAS.clientes, rotulo: "Clientes", icone: Users },
  { href: ROTAS.perfil, rotulo: "Perfil", icone: User },
];

type PropsBase = { caminho: string | null };

const estaAtivo = (item: ItemNavegacao, caminho: string | null) =>
  caminho !== null &&
  (item.exato ? caminho === item.href : caminho.startsWith(item.href));

function SuperiorBase({ caminho }: PropsBase) {
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {ITENS.map((item) => {
        const ativo = estaAtivo(item, caminho);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              ativo &&
                "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

function InferiorBase({ caminho }: PropsBase) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid h-16 grid-cols-4">
        {ITENS.map((item) => {
          const Icone = item.icone;
          const ativo = estaAtivo(item, caminho);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
                  ativo && "text-primary",
                )}
              >
                <Icone className="size-5" aria-hidden />
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ComCaminho({ Base }: { Base: (props: PropsBase) => React.ReactNode }) {
  return <Base caminho={usePathname()} />;
}

/*
 * Com Cache Components, ler a URL (usePathname) em rotas dinâmicas exige
 * <Suspense>. O fallback é a mesma barra, só sem o item destacado.
 */

/** Computador: links horizontais no cabeçalho. */
export function NavegacaoSuperior() {
  return (
    <Suspense fallback={<SuperiorBase caminho={null} />}>
      <ComCaminho Base={SuperiorBase} />
    </Suspense>
  );
}

/** Celular: barra fixa embaixo, ao alcance do polegar. */
export function NavegacaoInferior() {
  return (
    <Suspense fallback={<InferiorBase caminho={null} />}>
      <ComCaminho Base={InferiorBase} />
    </Suspense>
  );
}
