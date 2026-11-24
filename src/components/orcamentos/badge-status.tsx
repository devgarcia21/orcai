import { Badge } from "@/components/ui/badge";
import { ROTULOS_STATUS_EXIBICAO, type StatusExibicao } from "@/lib/orcamento/regras";
import { cn } from "@/lib/utils";

export const CORES_STATUS: Record<StatusExibicao, string> = {
  rascunho: "bg-zinc-100 text-zinc-700 border-zinc-200",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recusado: "bg-red-50 text-red-700 border-red-200",
  vencido: "bg-amber-50 text-amber-800 border-amber-200",
};

export function BadgeStatus({
  status,
  className,
}: {
  /** Use o status de exibição ("vencido" para enviados fora da validade). */
  status: StatusExibicao;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(CORES_STATUS[status], className)}>
      {ROTULOS_STATUS_EXIBICAO[status]}
    </Badge>
  );
}
