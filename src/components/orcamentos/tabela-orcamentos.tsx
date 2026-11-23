import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/moeda";
import { formatarNumeroOrcamento } from "@/lib/orcamento/regras";
import { rotaOrcamento } from "@/lib/rotas";
import type { OrcamentoResumo } from "@/lib/types/database";

import { BadgeStatus } from "./badge-status";

type Props = {
  orcamentos: OrcamentoResumo[];
  /** Na página de um cliente, a coluna de cliente é redundante. */
  ocultarCliente?: boolean;
};

/**
 * Lista de orçamentos: cartões no celular, tabela a partir do md.
 * Componente de apresentação, sem estado — usado em várias páginas.
 */
export function TabelaOrcamentos({ orcamentos, ocultarCliente }: Props) {
  return (
    <>
      {/* Celular: cartões */}
      <ul className="grid gap-3 md:hidden">
        {orcamentos.map((o) => (
          <li key={o.id}>
            <Link
              href={rotaOrcamento(o.id)}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground tabular-nums">
                    {formatarNumeroOrcamento(o.numero)} · {formatarData(o.created_at)}
                  </p>
                  <p className="mt-0.5 truncate font-medium">{o.titulo}</p>
                  {!ocultarCliente && (
                    <p className="truncate text-sm text-muted-foreground">
                      {o.cliente_nome}
                    </p>
                  )}
                </div>
                <BadgeStatus status={o.status} />
              </div>
              <p className="mt-3 text-lg font-semibold tabular-nums">
                {formatarMoeda(o.total_centavos)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Computador: tabela */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nº</th>
              <th className="px-4 py-3 font-medium">Título</th>
              {!ocultarCliente && <th className="px-4 py-3 font-medium">Cliente</th>}
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="w-8" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y">
            {orcamentos.map((o) => (
              <tr key={o.id} className="group relative hover:bg-muted/50">
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {formatarNumeroOrcamento(o.numero)}
                </td>
                <td className="max-w-64 truncate px-4 py-3 font-medium">
                  {/* O link cobre a linha inteira (::after absoluto). */}
                  <Link
                    href={rotaOrcamento(o.id)}
                    className="after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {o.titulo}
                  </Link>
                </td>
                {!ocultarCliente && (
                  <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                    {o.cliente_nome}
                  </td>
                )}
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {formatarData(o.created_at)}
                </td>
                <td className="px-4 py-3">
                  <BadgeStatus status={o.status} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatarMoeda(o.total_centavos)}
                </td>
                <td className="pr-3">
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
