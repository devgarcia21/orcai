"use client";

import { FileText, SearchX } from "lucide-react";
import { useState } from "react";

import { CampoBusca } from "@/components/comum/campo-busca";
import { EstadoVazio } from "@/components/comum/estado-vazio";
import { correspondeBusca } from "@/lib/busca";
import {
  formatarNumeroOrcamento,
  ROTULOS_STATUS_EXIBICAO,
  type StatusExibicao,
} from "@/lib/orcamento/regras";
import type { OrcamentoResumo } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { BotaoNovoOrcamento } from "./botao-novo-orcamento";
import { TabelaOrcamentos } from "./tabela-orcamentos";

type Filtro = StatusExibicao | "todos";

/** Ordem dos chips. "Vencido" = enviado fora da validade (só exibição). */
const STATUS_FILTRO: StatusExibicao[] = [
  "rascunho",
  "enviado",
  "vencido",
  "aprovado",
  "recusado",
];

/** Busca por título, cliente ou número ("12", "#0012" ou "0012"). */
function corresponde(o: OrcamentoResumo, termo: string) {
  const numero = termo.replace(/^#/, "").trim();
  if (/^\d+$/.test(numero) && Number(numero) === o.numero) return true;
  return correspondeBusca(termo, [
    o.titulo,
    o.cliente_nome,
    formatarNumeroOrcamento(o.numero),
  ]);
}

export function ListaOrcamentos({ orcamentos }: { orcamentos: OrcamentoResumo[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  if (orcamentos.length === 0) {
    return (
      <EstadoVazio
        icone={FileText}
        titulo="Você ainda não tem orçamentos"
        descricao="Crie o primeiro em poucos minutos: escolha o cliente, adicione os itens e pronto."
        acao={<BotaoNovoOrcamento className="w-full" texto="Criar primeiro orçamento" />}
      />
    );
  }

  const contagem = (status: Filtro) =>
    status === "todos"
      ? orcamentos.length
      : orcamentos.filter((o) => o.status_exibicao === status).length;

  const filtrados = orcamentos.filter(
    (o) => (filtro === "todos" || o.status_exibicao === filtro) && corresponde(o, busca),
  );

  const opcoes: { valor: Filtro; rotulo: string }[] = [
    { valor: "todos" as Filtro, rotulo: "Todos" },
    ...STATUS_FILTRO.map((s) => ({
      valor: s as Filtro,
      rotulo: ROTULOS_STATUS_EXIBICAO[s],
    })),
  ].filter(
    // "Vencido" só aparece quando existe algum (ou se estiver selecionado).
    (opcao) =>
      opcao.valor !== "vencido" || filtro === "vencido" || contagem("vencido") > 0,
  );

  return (
    <div className="grid gap-4">
      <CampoBusca
        valor={busca}
        aoMudar={setBusca}
        placeholder="Buscar por título, cliente ou número"
        rotulo="Buscar orçamentos"
      />

      {/* Chips de status: rolam na horizontal no celular */}
      <div
        role="group"
        aria-label="Filtrar por status"
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
      >
        {opcoes.map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            aria-pressed={filtro === valor}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted",
              filtro === valor &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {rotulo}
            <span className="text-xs tabular-nums opacity-70">{contagem(valor)}</span>
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhum orçamento encontrado"
          descricao={
            busca
              ? `Nada corresponde a "${busca}" neste filtro.`
              : `Você não tem orçamentos com status "${ROTULOS_STATUS_EXIBICAO[filtro as StatusExibicao]}".`
          }
        />
      ) : (
        <TabelaOrcamentos orcamentos={filtrados} />
      )}
    </div>
  );
}
