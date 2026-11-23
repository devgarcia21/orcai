import { ArrowRight, FileText, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { TabelaOrcamentos } from "@/components/orcamentos/tabela-orcamentos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual, perfilCompleto } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Painel" };

const QUANTIDADE_RECENTES = 5;

export default async function PainelPage() {
  const [prestador, recentes] = await Promise.all([
    obterPrestadorAtual(),
    listarOrcamentos(undefined, QUANTIDADE_RECENTES),
  ]);
  const primeiroNome = prestador.nome.split(" ")[0] || "prestador";
  const completo = perfilCompleto(prestador);

  const faltando = [
    !prestador.telefone && "telefone",
    !prestador.chave_pix && "chave PIX",
  ].filter(Boolean);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {primeiroNome}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Crie orçamentos profissionais e acompanhe cada um por aqui.
          </p>
        </div>
        <BotaoNovoOrcamento className="h-14 w-full text-base sm:h-12 sm:w-auto" />
      </div>

      {!completo && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900">
          <TriangleAlert />
          <AlertTitle>Complete seu perfil</AlertTitle>
          <AlertDescription>
            <p>
              Falta informar {faltando.join(" e ")}. Esses dados aparecem nos orçamentos
              que você enviar.
            </p>
            <Link href={ROTAS.perfil} className="font-medium">
              Completar perfil agora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-3" aria-labelledby="titulo-recentes">
        <div className="flex items-center justify-between">
          <h2 id="titulo-recentes" className="font-semibold">
            Últimos orçamentos
          </h2>
          {recentes.length > 0 && (
            <Link
              href={ROTAS.orcamentos}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>

        {recentes.length > 0 ? (
          <TabelaOrcamentos orcamentos={recentes} />
        ) : (
          <EstadoVazio
            icone={FileText}
            titulo="Você ainda não tem orçamentos"
            descricao="Monte o primeiro em poucos minutos: escolha o cliente, adicione os itens e pronto."
            acao={
              <BotaoNovoOrcamento className="w-full" texto="Criar primeiro orçamento" />
            }
          />
        )}
      </section>
    </div>
  );
}
