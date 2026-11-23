import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioPerfil } from "@/components/perfil/formulario-perfil";
import { Card, CardContent } from "@/components/ui/card";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const prestador = await obterPrestadorAtual();

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={ROTAS.painel}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar ao painel
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-muted-foreground">
          Esses dados aparecem nos orçamentos que você envia aos clientes.
        </p>
      </div>

      <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
        <CardContent>
          <FormularioPerfil prestador={prestador} />
        </CardContent>
      </Card>
    </div>
  );
}
