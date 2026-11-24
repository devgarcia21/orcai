import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Esqueletos com o MESMO formato do conteúdo real, para a página não "pular"
 * quando os dados chegam. Cada um fica no lugar exato do que substitui.
 */

/** Container acessível: anuncia "Carregando" e esconde os blocos dos leitores de tela. */
function Carregando({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Carregando" className={className}>
      {children}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

/** Nome/logo do prestador no cabeçalho. */
export function EsqueletoIdentidade() {
  return <Skeleton className="h-5 w-32" />;
}

/** Uma linha de texto (ex.: saudação). Feito de <span>: pode ficar dentro de <h1>/<p>. */
export function EsqueletoLinha({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Carregando" className="inline-block align-middle">
      <span
        aria-hidden
        className={cn("block h-4 w-48 animate-pulse rounded-md bg-muted", className)}
      />
    </span>
  );
}

/** Título + subtítulo de uma página de detalhes. */
export function EsqueletoTitulo() {
  return (
    <Carregando className="grid gap-2">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-48" />
    </Carregando>
  );
}

/** Lista de orçamentos: cartões no celular, tabela no computador (igual a TabelaOrcamentos). */
export function EsqueletoTabelaOrcamentos({ linhas = 4 }: { linhas?: number }) {
  const lista = Array.from({ length: linhas }, (_, i) => i);
  return (
    <Carregando>
      <ul className="grid gap-3 md:hidden">
        {lista.map((i) => (
          <li key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-6 w-28" />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="h-10 border-b bg-muted/40" />
        <div className="divide-y">
          {lista.map((i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Carregando>
  );
}

/** Busca + chips + lista (página de orçamentos). */
export function EsqueletoListaOrcamentos() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="flex gap-2 overflow-hidden">
        {[16, 20, 20, 22, 22].map((w, i) => (
          <Skeleton
            key={i}
            className="h-9 shrink-0 rounded-full"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>
      <EsqueletoTabelaOrcamentos linhas={5} />
    </div>
  );
}

/** Busca + lista de clientes (igual a ListaClientes). */
export function EsqueletoListaClientes() {
  return (
    <Carregando className="grid gap-4">
      <Skeleton className="h-11 w-full rounded-lg" />
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
    </Carregando>
  );
}

/** Campo de formulário: rótulo + input. */
function EsqueletoCampo({ alto }: { alto?: boolean }) {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className={cn("w-full rounded-lg", alto ? "h-20" : "h-11")} />
    </div>
  );
}

/** Formulário genérico dentro de um card (perfil). */
export function EsqueletoFormulario({ campos = 6 }: { campos?: number }) {
  return (
    <Carregando>
      <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
        <CardContent className="grid gap-5">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: campos }, (_, i) => (
            <EsqueletoCampo key={i} />
          ))}
          <Skeleton className="h-11 w-40 rounded-lg" />
        </CardContent>
      </Card>
    </Carregando>
  );
}

/** Formulário de orçamento: cards à esquerda e resumo à direita no lg. */
export function EsqueletoFormularioOrcamento() {
  return (
    <Carregando className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <EsqueletoCampo />
          </CardContent>
        </Card>
        {/* Montar com IA */}
        <Card>
          <CardContent className="grid gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg sm:w-36" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      <Card className="hidden lg:flex">
        <CardContent className="grid gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </CardContent>
      </Card>
    </Carregando>
  );
}

/** Página do orçamento: título, ações, prestador/cliente, itens e valores. */
export function EsqueletoDetalheOrcamento() {
  return (
    <Carregando className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {/* Ações: PDF, mudança de status e editar/duplicar/excluir (como em AcoesOrcamento) */}
      <Card>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Skeleton className="h-11 rounded-lg sm:w-28" />
            <Skeleton className="h-11 rounded-lg sm:w-32" />
          </div>
          <div className="grid gap-2 sm:flex">
            <Skeleton className="h-11 rounded-lg sm:w-48" />
            <Skeleton className="h-11 rounded-lg sm:w-48" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <Skeleton className="h-11 rounded-lg sm:w-20" />
            <Skeleton className="h-11 rounded-lg sm:w-24" />
            <Skeleton className="h-11 rounded-lg sm:w-20" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Card>
            <CardContent className="grid gap-4">
              <Skeleton className="h-5 w-24" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </Carregando>
  );
}

/** Página do cliente: título, contatos e orçamentos. */
export function EsqueletoDetalheCliente() {
  return (
    <Carregando className="grid gap-6">
      <div className="grid gap-4 sm:flex sm:items-end sm:justify-between">
        <Skeleton className="h-8 w-56 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      <Card>
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-5 w-32" />
      <EsqueletoTabelaOrcamentos linhas={2} />
    </Carregando>
  );
}

/** Painel de métricas: 5 cartões, gráfico + funil e "Precisa da sua atenção". */
export function EsqueletoMetricas() {
  return (
    <Carregando className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Card
            key={i}
            size="sm"
            className={i === 0 ? "col-span-2 lg:col-span-1" : undefined}
          >
            <CardContent className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="grid gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </Carregando>
  );
}
