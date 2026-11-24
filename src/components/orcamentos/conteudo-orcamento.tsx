import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarQuantidade } from "@/lib/moeda";
import { totalItem } from "@/lib/orcamento/calculos";
import { ROTULOS_UNIDADE } from "@/lib/orcamento/regras";
import type { OrcamentoDocumento } from "@/lib/types/database";

/**
 * Blocos de conteúdo do orçamento usados no painel e na página pública do
 * cliente. Recebem só OrcamentoDocumento (sem ids), então servem aos dois.
 */

export function ItensOrcamento({ itens }: Pick<OrcamentoDocumento, "itens">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens ({itens.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {itens.map((item, i) => (
            // A ordem é fixa (vem ordenada do banco) e a versão pública não tem ids.
            <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{item.descricao}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatarQuantidade(item.quantidade)}{" "}
                  {ROTULOS_UNIDADE[item.unidade].curto} ×{" "}
                  {formatarMoeda(item.valor_unitario_centavos)}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {formatarMoeda(totalItem(item))}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function BlocoTexto({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{titulo}</h3>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{texto}</p>
    </div>
  );
}

export function CondicoesObservacoes({
  condicoes_pagamento,
  observacoes,
}: Pick<OrcamentoDocumento, "condicoes_pagamento" | "observacoes">) {
  if (!condicoes_pagamento && !observacoes) return null;
  return (
    <Card>
      <CardContent className="grid gap-4">
        <BlocoTexto titulo="Condições de pagamento" texto={condicoes_pagamento} />
        <BlocoTexto titulo="Observações" texto={observacoes} />
      </CardContent>
    </Card>
  );
}
