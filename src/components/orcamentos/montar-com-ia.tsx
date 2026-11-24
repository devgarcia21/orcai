"use client";

import { ListPlus, Loader2, Mic, Sparkles, Square, Trash2 } from "lucide-react";
import { useState, useTransition, type KeyboardEvent } from "react";

import { gerarItensComIA, type SugestaoGerada } from "@/actions/ia";
import { CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { InputMoeda } from "@/components/formulario/input-moeda";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { SelectNativo } from "@/components/formulario/select-nativo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDitado } from "@/hooks/use-ditado";
import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";
import { TEXTO_MAXIMO_IA } from "@/lib/ia/limite";
import type { ItemSugerido } from "@/lib/ia/resposta";
import { formatarQuantidade, lerQuantidade } from "@/lib/moeda";
import { ROTULOS_UNIDADE } from "@/lib/orcamento/regras";
import { UNIDADES_ITEM, type UnidadeItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { AvisoDefinaValor, CLASSE_VALOR_PENDENTE } from "./editor-itens";

/** Item na pré-visualização: editável e com caixa de seleção. */
type ItemRevisao = {
  chave: string;
  incluir: boolean;
  descricao: string;
  /** Texto digitado (como no editor de itens). */
  quantidade: string;
  unidade: UnidadeItem;
  /** `null` = sem valor no histórico → "Defina o valor". */
  valor: number | null;
};

type Revisao = Pick<SugestaoGerada, "titulo" | "avisos" | "itensNoHistorico"> & {
  itens: ItemRevisao[];
};

export type ItemParaAdicionar = Omit<ItemRevisao, "chave" | "incluir">;

type Props = {
  /** false quando não há GEMINI_API_KEY: o bloco aparece desativado. */
  disponivel: boolean;
  /** Acrescenta os itens ao formulário; devolve quantos entraram. */
  aoAdicionar: (itens: ItemParaAdicionar[], tituloSugerido: string) => number;
};

let contador = 0;
const novaChave = () => `ia-${++contador}`;

function paraRevisao(item: ItemSugerido): ItemRevisao {
  return {
    chave: novaChave(),
    incluir: true,
    descricao: item.descricao,
    quantidade: formatarQuantidade(item.quantidade).replace(/\./g, ""),
    unidade: item.unidade,
    valor: item.valor_unitario_centavos,
  };
}

/** Enter num campo da pré-visualização não pode enviar (salvar) o orçamento. */
function segurarEnter(evento: KeyboardEvent<HTMLDivElement>) {
  if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
    evento.preventDefault();
  }
}

/**
 * "Montar com IA": o prestador descreve (ou dita) o serviço, a IA sugere os
 * itens, ele revisa e adiciona ao formulário. Nada é salvo automaticamente.
 */
export function MontarComIA({ disponivel, aoAdicionar }: Props) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<EstadoAcao<unknown>>(ESTADO_INICIAL);
  const [erroTexto, setErroTexto] = useState<string[] | undefined>();
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [gerando, iniciarGeracao] = useTransition();

  const ditado = useDitado((trecho) =>
    setTexto((atual) =>
      (atual.trim() ? `${atual.trimEnd()} ${trecho}` : trecho).slice(0, TEXTO_MAXIMO_IA),
    ),
  );

  const excedeu = texto.length > TEXTO_MAXIMO_IA;
  const bloqueado = !disponivel || gerando;

  function gerar() {
    if (ditado.ouvindo) ditado.parar();
    setEstado(ESTADO_INICIAL);
    setErroTexto(undefined);
    iniciarGeracao(async () => {
      const resultado = await gerarItensComIA(texto);
      if (resultado.status === "sucesso" && resultado.dados) {
        const { titulo, avisos, itensNoHistorico, itens } = resultado.dados;
        setRevisao({ titulo, avisos, itensNoHistorico, itens: itens.map(paraRevisao) });
        setEstado(ESTADO_INICIAL);
      } else {
        setRevisao(null);
        setErroTexto(resultado.errosCampos?.texto);
        // Erro do texto aparece embaixo do campo; os outros, numa mensagem.
        setEstado(resultado.errosCampos?.texto ? ESTADO_INICIAL : resultado);
      }
    });
  }

  const atualizar = (chave: string, mudanca: Partial<ItemRevisao>) =>
    setRevisao(
      (r) =>
        r && {
          ...r,
          itens: r.itens.map((item) =>
            item.chave === chave ? { ...item, ...mudanca } : item,
          ),
        },
    );
  const remover = (chave: string) =>
    setRevisao(
      (r) => r && { ...r, itens: r.itens.filter((item) => item.chave !== chave) },
    );

  const selecionados = revisao?.itens.filter((item) => item.incluir) ?? [];
  const quantidadeInvalida = selecionados.some(
    (item) => !((lerQuantidade(item.quantidade) ?? 0) > 0),
  );
  const descricaoVazia = selecionados.some((item) => !item.descricao.trim());

  function adicionar() {
    if (!revisao || selecionados.length === 0) return;
    const adicionados = aoAdicionar(
      selecionados.map(({ descricao, quantidade, unidade, valor }) => ({
        descricao: descricao.trim(),
        quantidade,
        unidade,
        valor,
      })),
      revisao.titulo,
    );
    const pendentes = selecionados
      .slice(0, adicionados)
      .filter((i) => i.valor === null).length;
    setRevisao(null);
    setTexto("");
    setEstado({
      status: adicionados > 0 ? "sucesso" : "erro",
      mensagem:
        adicionados === 0
          ? "O orçamento já tem o máximo de itens."
          : `${adicionados} ${adicionados === 1 ? "item adicionado" : "itens adicionados"} ao orçamento.` +
            (adicionados < selecionados.length
              ? ` ${selecionados.length - adicionados} não couberam (máximo de itens).`
              : "") +
            (pendentes > 0 ? " Defina os valores destacados antes de salvar." : ""),
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03] [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Montar com IA</h2>
        </div>

        {!disponivel && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            IA indisponível no momento. Você pode adicionar os itens manualmente abaixo.
          </p>
        )}

        <CampoBase
          id="ia-texto"
          rotulo="Descreva o serviço"
          erros={erroTexto}
          dica={
            <span className="flex justify-between gap-3">
              <span>
                {ditado.ouvindo
                  ? ditado.parcial
                    ? `Ouvindo: “${ditado.parcial}”`
                    : "Ouvindo... fale o que vai ser feito."
                  : "A IA sugere os itens; você revisa antes de adicionar."}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  excedeu && "font-medium text-destructive",
                )}
              >
                {texto.length.toLocaleString("pt-BR")}/
                {TEXTO_MAXIMO_IA.toLocaleString("pt-BR")}
              </span>
            </span>
          }
        >
          {(aria) => (
            <div className="relative">
              <Textarea
                rows={3}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Descreva o serviço, ex.: trocar 3 tomadas, instalar um chuveiro e passar 10 metros de fio"
                disabled={bloqueado}
                className={cn(
                  CLASSE_CONTROLE,
                  "h-auto min-h-24",
                  ditado.suportado && "pr-14",
                )}
                {...aria}
              />
              {ditado.suportado && (
                <Button
                  type="button"
                  variant={ditado.ouvindo ? "destructive" : "outline"}
                  size="icon"
                  className={cn(
                    "absolute top-2 right-2 size-11",
                    ditado.ouvindo && "animate-pulse",
                  )}
                  onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar}
                  disabled={bloqueado}
                  aria-label={ditado.ouvindo ? "Parar de ditar" : "Ditar por voz"}
                  aria-pressed={ditado.ouvindo}
                >
                  {ditado.ouvindo ? <Square aria-hidden /> : <Mic aria-hidden />}
                </Button>
              )}
            </div>
          )}
        </CampoBase>

        {ditado.erro && <p className="text-sm text-amber-700">{ditado.erro}</p>}

        <Button
          type="button"
          className="h-11 w-full sm:w-fit"
          onClick={gerar}
          disabled={bloqueado || excedeu || !texto.trim()}
        >
          {gerando ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Sparkles aria-hidden />
          )}
          {gerando ? "Gerando itens..." : "Gerar itens"}
        </Button>

        <MensagemFormulario estado={estado} />

        {revisao && (
          <section
            aria-label="Itens sugeridos pela IA"
            className="grid gap-3 rounded-xl border bg-background p-3 sm:p-4"
            onKeyDown={segurarEnter}
          >
            <div className="grid gap-1">
              <h3 className="font-semibold">
                {revisao.itens.length}{" "}
                {revisao.itens.length === 1 ? "item sugerido" : "itens sugeridos"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {revisao.itensNoHistorico === 0
                  ? "Você ainda não tem itens com valor em orçamentos anteriores: defina os valores destacados."
                  : "Os valores só são preenchidos quando o item já existe no seu histórico de preços."}{" "}
                Edite, remova ou desmarque o que não quiser.
              </p>
              {revisao.avisos.map((aviso) => (
                <p key={aviso} className="text-sm text-amber-700">
                  {aviso}
                </p>
              ))}
            </div>

            <ol className="grid gap-3">
              {revisao.itens.map((item, i) => {
                const pendente = item.valor === null;
                return (
                  <li
                    key={item.chave}
                    className={cn(
                      "grid gap-3 rounded-lg border p-3 transition-opacity",
                      !item.incluir && "opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={item.incluir}
                          onChange={(e) =>
                            atualizar(item.chave, { incluir: e.target.checked })
                          }
                          className="size-5 accent-primary"
                        />
                        Incluir item {i + 1}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-foreground hover:text-destructive"
                        onClick={() => remover(item.chave)}
                        aria-label={`Remover sugestão ${i + 1}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>

                    <CampoBase id={`ia-item-${i}-descricao`} rotulo="Descrição">
                      {(aria) => (
                        <Input
                          value={item.descricao}
                          onChange={(e) =>
                            atualizar(item.chave, { descricao: e.target.value })
                          }
                          className={CLASSE_CONTROLE}
                          {...aria}
                        />
                      )}
                    </CampoBase>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
                      <CampoBase id={`ia-item-${i}-quantidade`} rotulo="Qtd.">
                        {(aria) => (
                          <Input
                            value={item.quantidade}
                            onChange={(e) =>
                              atualizar(item.chave, {
                                quantidade: e.target.value.replace(/[^\d.,]/g, ""),
                              })
                            }
                            inputMode="decimal"
                            className={CLASSE_CONTROLE}
                            {...aria}
                          />
                        )}
                      </CampoBase>
                      <CampoBase id={`ia-item-${i}-unidade`} rotulo="Unidade">
                        {(aria) => (
                          <SelectNativo
                            value={item.unidade}
                            onChange={(e) =>
                              atualizar(item.chave, {
                                unidade: e.target.value as UnidadeItem,
                              })
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
                        id={`ia-item-${i}-valor`}
                        rotulo="Valor unitário"
                        className="col-span-2 sm:col-span-1"
                        dica={
                          pendente ? <AvisoDefinaValor /> : "Do seu histórico de preços"
                        }
                      >
                        {(aria) => (
                          <InputMoeda
                            centavos={item.valor ?? 0}
                            aoMudar={(centavos) =>
                              atualizar(item.chave, {
                                valor: centavos > 0 ? centavos : null,
                              })
                            }
                            className={cn(
                              CLASSE_CONTROLE,
                              "tabular-nums",
                              pendente && CLASSE_VALOR_PENDENTE,
                            )}
                            {...aria}
                          />
                        )}
                      </CampoBase>
                    </div>
                  </li>
                );
              })}
            </ol>

            {(quantidadeInvalida || descricaoVazia) && (
              <p className="text-sm text-destructive">
                {descricaoVazia
                  ? "Preencha a descrição dos itens marcados."
                  : "Confira as quantidades: use números maiores que zero (ex.: 2,5)."}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => setRevisao(null)}
              >
                Descartar sugestões
              </Button>
              <Button
                type="button"
                className="h-11"
                onClick={adicionar}
                disabled={
                  selecionados.length === 0 || quantidadeInvalida || descricaoVazia
                }
              >
                <ListPlus aria-hidden />
                Adicionar ao orçamento
                {selecionados.length > 0 && ` (${selecionados.length})`}
              </Button>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
