import { FileText, Mail, MapPin, Pencil, Phone, StickyNote } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoExcluirCliente } from "@/components/clientes/botao-excluir-cliente";
import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { CabecalhoPagina, LinkVoltar } from "@/components/comum/cabecalho-pagina";
import { EstadoVazio } from "@/components/comum/estado-vazio";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";
import { TabelaOrcamentos } from "@/components/orcamentos/tabela-orcamentos";
import { EsqueletoDetalheCliente } from "@/components/painel/esqueletos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { obterCliente } from "@/lib/dados/clientes";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { formatarTelefone } from "@/lib/formatacao";
import { rotaNovoOrcamentoPara, ROTAS } from "@/lib/rotas";

export const metadata: Metadata = { title: "Cliente" };

function Dado({
  icone: Icone,
  children,
}: {
  icone: typeof Phone;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

type Params = PageProps<"/painel/clientes/[id]">["params"];

async function DetalheCliente({ params }: { params: Params }) {
  const { id } = await params;
  const [cliente, orcamentos] = await Promise.all([
    obterCliente(id),
    listarOrcamentos(id),
  ]);
  if (!cliente) notFound();

  const temDados =
    cliente.telefone || cliente.email || cliente.endereco || cliente.observacoes;

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo={cliente.nome}
        acoes={
          <>
            <DialogoCliente
              cliente={cliente}
              gatilho={
                <Button variant="outline" className="h-10">
                  <Pencil aria-hidden />
                  Editar
                </Button>
              }
            />
            <BotaoExcluirCliente
              cliente={cliente}
              totalOrcamentos={orcamentos.length}
              voltarParaLista
            />
          </>
        }
      />

      <Card>
        <CardContent>
          {temDados ? (
            <ul className="grid gap-3 text-sm">
              {cliente.telefone && (
                <Dado icone={Phone}>
                  <a href={`tel:${cliente.telefone}`} className="hover:underline">
                    {formatarTelefone(cliente.telefone)}
                  </a>
                </Dado>
              )}
              {cliente.email && (
                <Dado icone={Mail}>
                  <a href={`mailto:${cliente.email}`} className="hover:underline">
                    {cliente.email}
                  </a>
                </Dado>
              )}
              {cliente.endereco && <Dado icone={MapPin}>{cliente.endereco}</Dado>}
              {cliente.observacoes && (
                <Dado icone={StickyNote}>
                  <span className="whitespace-pre-line">{cliente.observacoes}</span>
                </Dado>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum dado de contato cadastrado. Use &quot;Editar&quot; para adicionar
              telefone, e-mail ou endereço.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3" aria-labelledby="titulo-orcamentos-cliente">
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-orcamentos-cliente" className="font-semibold">
            Orçamentos ({orcamentos.length})
          </h2>
          {orcamentos.length > 0 && (
            <BotaoNovoOrcamento
              href={rotaNovoOrcamentoPara(cliente.id)}
              className="h-10"
            />
          )}
        </div>
        {orcamentos.length > 0 ? (
          <TabelaOrcamentos orcamentos={orcamentos} ocultarCliente />
        ) : (
          <EstadoVazio
            icone={FileText}
            titulo="Nenhum orçamento para este cliente"
            descricao={`Crie o primeiro orçamento para ${cliente.nome}.`}
            acao={
              <BotaoNovoOrcamento
                href={rotaNovoOrcamentoPara(cliente.id)}
                className="w-full"
                texto="Criar orçamento"
              />
            }
          />
        )}
      </section>
    </div>
  );
}

/** Casca: o link de voltar aparece na hora; os dados do cliente chegam em streaming. */
export default function ClientePage({ params }: PageProps<"/painel/clientes/[id]">) {
  return (
    <div className="grid gap-3">
      <LinkVoltar href={ROTAS.clientes} rotulo="Clientes" />
      <Suspense fallback={<EsqueletoDetalheCliente />}>
        <DetalheCliente params={params} />
      </Suspense>
    </div>
  );
}
