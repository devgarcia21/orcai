import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoPagina } from "@/components/comum/cabecalho-pagina";
import { EsqueletoFormulario } from "@/components/painel/esqueletos";
import { FormularioPerfil } from "@/components/perfil/formulario-perfil";
import { Card, CardContent } from "@/components/ui/card";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Meu perfil" };

async function Formulario() {
  const prestador = await obterPrestadorAtual();
  return (
    <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
      <CardContent>
        <FormularioPerfil prestador={prestador} />
      </CardContent>
    </Card>
  );
}

/** Casca: título aparece na hora; o formulário preenchido chega em streaming. */
export default function PerfilPage() {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        voltar={{ href: ROTAS.painel, rotulo: "Voltar ao painel" }}
        titulo="Meu perfil"
        descricao="Esses dados aparecem nos orçamentos que você envia aos clientes."
      />
      <Suspense fallback={<EsqueletoFormulario campos={7} />}>
        <Formulario />
      </Suspense>
    </div>
  );
}
