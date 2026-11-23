import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder do nome/logo no cabeçalho enquanto o perfil carrega. */
export function CabecalhoCarregando() {
  return <Skeleton className="h-5 w-32" />;
}

/** Placeholder genérico do conteúdo das páginas do painel. */
export function ConteudoCarregando() {
  return (
    <div className="grid gap-6" role="status" aria-label="Carregando">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
