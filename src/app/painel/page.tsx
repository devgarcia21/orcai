import { ArrowRight, FileText, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { TabelaOrcamentos } from "@/components/orcamentos/tabela-orcamentos";
import {
  EsqueletoLinha,
  EsqueletoTabelaOrcamentos,
} from "@/components/painel/esqueletos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { pendenciasPerfil, perfilCompleto } from "@/lib/prestador";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Painel" };

const QUANTIDADE_RECENTES = 5;

/** ["a", "b", "c"] → "a, b e c" */
const juntarComE = (itens: string[]) =>
  itens.length <= 1
    ? itens.join("")
    : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

async function Saudacao() {
  const prestador = await obterPrestadorAtual();
  const primeiroNome = prestador.nome.split(" ")[0] || "prestador";
  return <>Olá, {primeiroNome}! 👋</>;
}

async function AvisoPerfil() {
  const prestador = await obterPrestadorAtual();
  if (perfilCompleto(prestador)) return null;

  const faltando = pendenciasPerfil(prestador);

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900">
      <TriangleAlert />
      <AlertTitle>Complete seu perfil</AlertTitle>
      <AlertDescription>
        <p>
          Falta informar {juntarComE(faltando)}. Esses dados aparecem nos orçamentos que
          você enviar.
        </p>
        <Link href={ROTAS.perfil} className="font-medium">
          Completar perfil agora
        </Link>
      </AlertDescription>
    </Alert>
  );
}

async function OrcamentosRecentes() {
  const recentes = await listarOrcamentos(undefined, QUANTIDADE_RECENTES);

  if (recentes.length === 0) {
    return (
      <EstadoVazio
        icone={FileText}
        titulo="Você ainda não tem orçamentos"
        descricao="Monte o primeiro em poucos minutos: escolha o cliente, adicione os itens e pronto."
        acao={<BotaoNovoOrcamento className="w-full" texto="Criar primeiro orçamento" />}
      />
    );
  }
  return <TabelaOrcamentos orcamentos={recentes} />;
}

/** Casca síncrona: título, botão e seções aparecem na hora; os dados chegam em streaming. */
export default function PainelPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="min-h-8 text-2xl font-semibold tracking-tight">
            <Suspense fallback={<EsqueletoLinha className="h-7 w-44" />}>
              <Saudacao />
            </Suspense>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Crie orçamentos profissionais e acompanhe cada um por aqui.
          </p>
        </div>
        <BotaoNovoOrcamento className="h-14 w-full text-base sm:h-12 sm:w-auto" />
      </div>

      <Suspense fallback={null}>
        <AvisoPerfil />
      </Suspense>

      <section className="grid gap-3" aria-labelledby="titulo-recentes">
        <div className="flex items-center justify-between">
          <h2 id="titulo-recentes" className="font-semibold">
            Últimos orçamentos
          </h2>
          <Link
            href={ROTAS.orcamentos}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <Suspense fallback={<EsqueletoTabelaOrcamentos linhas={3} />}>
          <OrcamentosRecentes />
        </Suspense>
      </section>
    </div>
  );
}
