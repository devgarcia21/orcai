import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { sair } from "@/actions/auth";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { nomeDeExibicao, obterPrestadorAtual } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";

import { CabecalhoCarregando } from "./carregando";

/** Nome da empresa (ou do prestador) e logo, lidos do perfil. */
async function IdentidadePrestador() {
  const prestador = await obterPrestadorAtual();

  return (
    <Link
      href={ROTAS.perfil}
      className="flex min-w-0 items-center gap-2 rounded-md hover:opacity-80"
      title="Editar perfil"
    >
      {prestador.logo_url && (
        <Image
          src={prestador.logo_url}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded object-contain"
        />
      )}
      <span className="truncate text-sm font-medium">{nomeDeExibicao(prestador)}</span>
    </Link>
  );
}

export function CabecalhoPainel() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Marca href={ROTAS.painel} className="shrink-0" />
          <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
          <Suspense fallback={<CabecalhoCarregando />}>
            <IdentidadePrestador />
          </Suspense>
        </div>

        <form action={sair}>
          <Button type="submit" variant="ghost" className="h-10 shrink-0">
            <LogOut aria-hidden />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
