"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { InputMoeda } from "@/components/formulario/input-moeda";
import { SelectNativo } from "@/components/formulario/select-nativo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarMoeda, lerQuantidade } from "@/lib/moeda";
import { totalItem } from "@/lib/orcamento/calculos";
import { MAXIMO_ITENS, ROTULOS_UNIDADE } from "@/lib/orcamento/regras";
import { UNIDADES_ITEM, type UnidadeItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/** Item enquanto está sendo editado: a quantidade fica como texto digitado. */
export type ItemEditavel = {
  /** Chave estável para o React (não vai para o banco). */
  chave: string;
  descricao: string;
  quantidade: string;
  unidade: UnidadeItem;
  valor_unitario_centavos: number;
};

let contadorChaves = 0;
/**
 * Chave local só para o React identificar cada linha ao reordenar/remover.
 * Não vai para o DOM nem para o banco (por isso não precisa ser global).
 * Sem crypto.randomUUID: ele não existe em http:// fora do localhost.
 */
export const novaChave = () => `item-${++contadorChaves}`;

export const itemVazio = (): ItemEditavel => ({
  chave: novaChave(),
  descricao: "",
  quantidade: "1",
  unidade: "un",
  valor_unitario_centavos: 0,
});

/** Converte para o formato dos cálculos (quantidade inválida conta como 0). */
export const paraCalculo = (item: ItemEditavel) => ({
  quantidade: lerQuantidade(item.quantidade) ?? 0,
  valor_unitario_centavos: item.valor_unitario_centavos,
});

type Props = {
  itens: ItemEditavel[];
  aoMudar: (itens: ItemEditavel[]) => void;
  /** Erros do servidor por caminho: "itens.0.descricao". */
  erros: Partial<Record<string, string[]>>;
};

export function EditorItens({ itens, aoMudar, erros }: Props) {
  const atualizar = (indice: number, mudanca: Partial<ItemEditavel>) =>
    aoMudar(itens.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)));

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= itens.length) return;
    const copia = [...itens];
    [copia[de], copia[para]] = [copia[para], copia[de]];
    aoMudar(copia);
  };

  const remover = (indice: number) => aoMudar(itens.filter((_, i) => i !== indice));

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {itens.map((item, i) => {
          const erro = (campo: string) => erros[`itens.${i}.${campo}`];
          const totalLinha = totalItem(paraCalculo(item));

          return (
            <li key={item.chave} className="rounded-xl border bg-background p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Item {i + 1}
                </span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => mover(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Mover item ${i + 1} para cima`}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => mover(i, i + 1)}
                    disabled={i === itens.length - 1}
                    aria-label={`Mover item ${i + 1} para baixo`}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={() => remover(i)}
                    disabled={itens.length === 1}
                    aria-label={`Remover item ${i + 1}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                <CampoBase
                  id={`item-${i}-descricao`}
                  rotulo="Descrição"
                  erros={erro("descricao")}
                >
                  {(aria) => (
                    <Input
                      value={item.descricao}
                      onChange={(e) => atualizar(i, { descricao: e.target.value })}
                      placeholder="Ex.: Instalação de tomada"
                      className={CLASSE_CONTROLE}
                      {...aria}
                    />
                  )}
                </CampoBase>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
                  <CampoBase
                    id={`item-${i}-quantidade`}
                    rotulo="Qtd."
                    erros={erro("quantidade")}
                  >
                    {(aria) => (
                      <Input
                        value={item.quantidade}
                        onChange={(e) =>
                          atualizar(i, {
                            quantidade: e.target.value.replace(/[^\d.,]/g, ""),
                          })
                        }
                        inputMode="decimal"
                        placeholder="1"
                        className={CLASSE_CONTROLE}
                        {...aria}
                      />
                    )}
                  </CampoBase>

                  <CampoBase
                    id={`item-${i}-unidade`}
                    rotulo="Unidade"
                    erros={erro("unidade")}
                  >
                    {(aria) => (
                      <SelectNativo
                        value={item.unidade}
                        onChange={(e) =>
                          atualizar(i, { unidade: e.target.value as UnidadeItem })
                        }
                        {...aria}
                      >
                        {UNIDADES_ITEM.map((u) => (
                          <option key={u} value={u}>
                            {ROTULOS_UNIDADE[u].longo} ({ROTULOS_UNIDADE[u].curto})
                          </option>
                        ))}
                      </SelectNativo>
                    )}
                  </CampoBase>

                  <CampoBase
                    id={`item-${i}-valor`}
                    rotulo="Valor unitário"
                    erros={erro("valor_unitario_centavos")}
                    className="col-span-2 sm:col-span-1"
                  >
                    {(aria) => (
                      <InputMoeda
                        centavos={item.valor_unitario_centavos}
                        aoMudar={(centavos) =>
                          atualizar(i, { valor_unitario_centavos: centavos })
                        }
                        className={cn(CLASSE_CONTROLE, "tabular-nums")}
                        {...aria}
                      />
                    )}
                  </CampoBase>
                </div>

                <p className="flex items-baseline justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Total do item</span>
                  <span className="font-semibold tabular-nums">
                    {formatarMoeda(totalLinha)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {erros.itens && <p className="text-sm text-destructive">{erros.itens[0]}</p>}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-dashed"
        onClick={() => aoMudar([...itens, itemVazio()])}
        disabled={itens.length >= MAXIMO_ITENS}
      >
        <Plus aria-hidden />
        Adicionar item
      </Button>
    </div>
  );
}
