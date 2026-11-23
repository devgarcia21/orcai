import { FileText, MessageCircle, QrCode } from "lucide-react";
import Link from "next/link";

import { Marca } from "@/components/marca";
import { buttonVariants } from "@/components/ui/button";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

const PASSOS = [
  { icone: FileText, texto: "Monte o orçamento em minutos, direto do celular" },
  { icone: MessageCircle, texto: "Envie pelo WhatsApp com um link profissional" },
  { icone: QrCode, texto: "Receba o sinal por PIX assim que o cliente aprovar" },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Marca />
        <Link
          href={ROTAS.login}
          className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold text-primary">
            Para eletricistas, encanadores, pedreiros e oficinas
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Orçamentos profissionais no WhatsApp, com sinal por PIX.
          </h1>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            O Orçaí transforma o seu serviço em um orçamento bonito e claro, que o cliente
            aprova com um toque e paga o sinal na hora.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ROTAS.cadastro}
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
            >
              Criar conta grátis
            </Link>
            <Link
              href={ROTAS.login}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-12 px-6 text-base",
              )}
            >
              Entrar
            </Link>
          </div>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {PASSOS.map(({ icone: Icone, texto }) => (
            <li
              key={texto}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icone className="size-5" aria-hidden />
              </span>
              <span className="text-sm leading-snug">{texto}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground">
        Orçaí · Orçamentos profissionais para quem resolve.
      </footer>
    </div>
  );
}
