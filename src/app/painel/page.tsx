import { ArrowRight, ChartColumn, FileText, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { TabelaOrcamentos } from "@/components/orcamentos/tabela-orcamentos";
import {
  EsqueletoLinha,
  EsqueletoMetricas,
  EsqueletoTabelaOrcamentos,
} from "@/components/painel/esqueletos";
import { FiltroPeriodo } from "@/components/painel/filtro-periodo";
import { FunilPeriodo } from "@/components/painel/funil-periodo";
import { GraficoAprovado } from "@/components/painel/grafico-aprovado";
import { Indicadores } from "@/components/painel/indicadores";
import { PrecisaAtencao } from "@/components/painel/precisa-atencao";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hojeISO } from "@/lib/datas";
import {
  listarOrcamentosParaMetricas,
  possuiOrcamentoEnviado,
} from "@/lib/dados/metricas";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { obterPrestadorAtual } from "@/lib/dados/prestador";
import { calcularMetricas, type PainelMetricas } from "@/lib/metricas/calcular";
import {
  calcularPeriodo,
  dataMaisAntigaNecessaria,
  lerPeriodo,
} from "@/lib/metricas/periodo";
import { numeroComZeros } from "@/lib/orcamento/regras";
import { nomeDeExibicao, pendenciasPerfil, perfilCompleto } from "@/lib/prestador";
import { rotaPublicaOrcamento, ROTAS } from "@/lib/rotas";
import { urlDoApp } from "@/lib/url-app";
import { mensagemLembreteOrcamento, montarLinkWhatsApp } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Painel" };

const QUANTIDADE_RECENTES = 5;

type SearchParams = PageProps<"/painel">["searchParams"];

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

async function Filtro({ searchParams }: { searchParams: SearchParams }) {
  const { periodo } = await searchParams;
  return <FiltroPeriodo atual={lerPeriodo(periodo)} />;
}

/** Links "Lembrar pelo WhatsApp" dos orçamentos sem resposta (só os que têm link público). */
async function montarLembretes(
  semResposta: PainelMetricas["atencao"]["semResposta"]["itens"],
): Promise<Record<string, string>> {
  const comLink = semResposta.filter((item) => item.token_publico);
  if (comLink.length === 0) return {};
  const [base, prestador] = await Promise.all([urlDoApp(), obterPrestadorAtual()]);
  return Object.fromEntries(
    comLink.map((item) => [
      item.id,
      montarLinkWhatsApp(
        item.cliente_telefone,
        mensagemLembreteOrcamento({
          nomeCliente: item.cliente_nome,
          numero: numeroComZeros(item.numero),
          titulo: item.titulo,
          link: `${base}${rotaPublicaOrcamento(item.token_publico as string)}`,
          assinatura: nomeDeExibicao(prestador),
        }),
      ),
    ]),
  );
}

async function Metricas({ searchParams }: { searchParams: SearchParams }) {
  const [{ periodo: chave }, possuiEnviados] = await Promise.all([
    searchParams,
    possuiOrcamentoEnviado(),
  ]);

  if (!possuiEnviados) {
    return (
      <EstadoVazio
        icone={ChartColumn}
        titulo="Seus números aparecem aqui"
        descricao="Seus números aparecem aqui assim que você enviar o primeiro orçamento: valor aprovado, sinais a receber, taxa de aprovação e mais."
      />
    );
  }

  // "Hoje" no fuso de São Paulo, calculado no servidor depois do acesso aos dados.
  const hoje = hojeISO();
  const periodo = calcularPeriodo(lerPeriodo(chave), hoje);
  const orcamentos = await listarOrcamentosParaMetricas(
    dataMaisAntigaNecessaria(periodo, hoje),
  );
  const metricas = calcularMetricas(orcamentos, { periodo, hoje, agora: new Date() });
  const lembretes = await montarLembretes(metricas.atencao.semResposta.itens);

  return (
    <div className="grid gap-6">
      <section aria-label={`Indicadores · ${periodo.rotulo}`}>
        <Indicadores indicadores={metricas.indicadores} periodo={periodo} />
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <GraficoAprovado meses={metricas.meses} />
        <FunilPeriodo funil={metricas.funil} rotuloPeriodo={periodo.rotulo} />
      </div>
      <PrecisaAtencao atencao={metricas.atencao} lembretes={lembretes} />
    </div>
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

/** Casca síncrona: título, botão, filtro e seções aparecem na hora; os dados chegam em streaming. */
export default function PainelPage({ searchParams }: PageProps<"/painel">) {
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
            Veja como está o seu negócio e o que precisa de atenção.
          </p>
        </div>
        <BotaoNovoOrcamento className="h-14 w-full text-base sm:h-12 sm:w-auto" />
      </div>

      <Suspense fallback={null}>
        <AvisoPerfil />
      </Suspense>

      <Suspense fallback={<FiltroPeriodo atual={null} />}>
        <Filtro searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<EsqueletoMetricas />}>
        <Metricas searchParams={searchParams} />
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
