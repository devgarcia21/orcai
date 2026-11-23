"use client";

import { Save } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { salvarOrcamento, type EnvioOrcamento } from "@/actions/orcamentos";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo, CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { InputMoeda } from "@/components/formulario/input-moeda";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Secao } from "@/components/formulario/secao";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";
import { formatarMoeda, formatarQuantidade } from "@/lib/moeda";
import { calcularResumo } from "@/lib/orcamento/calculos";
import type { Cliente, OrcamentoCompleto } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import {
  EditorItens,
  itemVazio,
  novaChave,
  paraCalculo,
  type ItemEditavel,
} from "./editor-itens";
import { ResumoValores } from "./resumo-valores";
import { SeletorCliente } from "./seletor-cliente";

const ATALHOS_SINAL = [0, 30, 50, 100];

type Props = {
  clientes: Cliente[];
  /** Orçamento em edição; sem ele, é um orçamento novo. */
  orcamento?: OrcamentoCompleto;
  /** Validade sugerida para orçamentos novos (hoje + 15 dias), calculada no servidor. */
  validadePadrao: string;
  clienteInicialId?: string;
};

function itensIniciais(orcamento?: OrcamentoCompleto): ItemEditavel[] {
  if (!orcamento?.itens.length) return [itemVazio()];
  return orcamento.itens.map((item) => ({
    chave: novaChave(),
    descricao: item.descricao,
    quantidade: formatarQuantidade(item.quantidade).replace(/\./g, ""),
    unidade: item.unidade,
    valor_unitario_centavos: item.valor_unitario_centavos,
  }));
}

export function FormularioOrcamento({
  clientes: clientesIniciais,
  orcamento,
  validadePadrao,
  clienteInicialId,
}: Props) {
  const [estado, executar, enviando] = useActionState<EstadoAcao, EnvioOrcamento>(
    salvarOrcamento,
    ESTADO_INICIAL,
  );
  const erros = estado.errosCampos ?? {};
  const erro = (campo: string) => erros[campo]?.[0];

  // Clientes cadastrados aqui mesmo entram na lista local na hora.
  const [clientes, setClientes] = useState(clientesIniciais);
  const [clienteId, setClienteId] = useState(
    orcamento?.cliente_id ?? clienteInicialId ?? "",
  );
  const [titulo, setTitulo] = useState(orcamento?.titulo ?? "");
  const [itens, setItens] = useState<ItemEditavel[]>(() => itensIniciais(orcamento));
  const [desconto, setDesconto] = useState(orcamento?.desconto_centavos ?? 0);
  const [percentualSinal, setPercentualSinal] = useState(
    orcamento?.percentual_sinal ?? 0,
  );
  const [validoAte, setValidoAte] = useState(orcamento?.valido_ate ?? validadePadrao);
  const [condicoes, setCondicoes] = useState(orcamento?.condicoes_pagamento ?? "");
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? "");

  // Mesmo módulo de cálculo usado pelo servidor.
  const resumo = calcularResumo(itens.map(paraCalculo), desconto, percentualSinal);
  const descontoExcede = desconto > resumo.subtotal;

  // Leva a pessoa até a mensagem de erro após uma tentativa de salvar.
  const mensagemRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (estado.status === "erro") {
      mensagemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [estado]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const envio: EnvioOrcamento = {
      id: orcamento?.id,
      dados: {
        cliente_id: clienteId,
        titulo,
        itens: itens.map(
          ({ descricao, quantidade, unidade, valor_unitario_centavos }) => ({
            descricao,
            quantidade,
            unidade,
            valor_unitario_centavos,
          }),
        ),
        desconto_centavos: desconto,
        percentual_sinal: percentualSinal,
        valido_ate: validoAte,
        condicoes_pagamento: condicoes,
        observacoes,
      },
    };
    startTransition(() => executar(envio));
  }

  const textoBotao = orcamento ? "Salvar alterações" : "Salvar rascunho";

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
    >
      <div className="grid min-w-0 gap-6">
        <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardContent className="grid gap-6">
            <Secao titulo="Cliente">
              <SeletorCliente
                clientes={clientes}
                selecionadoId={clienteId}
                aoSelecionar={setClienteId}
                aoCriar={(novo) => {
                  setClientes((atuais) =>
                    [...atuais, novo].sort((a, b) =>
                      a.nome.localeCompare(b.nome, "pt-BR"),
                    ),
                  );
                  setClienteId(novo.id);
                }}
                erro={erro("cliente_id")}
              />
            </Secao>

            <Campo
              id="titulo"
              rotulo="Título do orçamento"
              placeholder="Ex.: Reforma elétrica do apartamento"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              erros={erros.titulo}
              autoComplete="off"
            />
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardContent>
            <Secao titulo="Itens">
              <EditorItens itens={itens} aoMudar={setItens} erros={erros} />
            </Secao>
          </CardContent>
        </Card>

        <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardContent>
            <Secao titulo="Valores e condições">
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoBase
                  id="desconto"
                  rotulo="Desconto (R$)"
                  erros={erros.desconto_centavos}
                  dica={
                    descontoExcede ? (
                      <span className="text-amber-700">
                        Maior que o subtotal ({formatarMoeda(resumo.subtotal)}). Ajuste o
                        valor.
                      </span>
                    ) : (
                      "Valor em reais abatido do subtotal."
                    )
                  }
                >
                  {(aria) => (
                    <InputMoeda
                      centavos={desconto}
                      aoMudar={setDesconto}
                      className={cn(CLASSE_CONTROLE, "tabular-nums")}
                      {...aria}
                    />
                  )}
                </CampoBase>

                <CampoBase
                  id="percentual_sinal"
                  rotulo="Sinal (% do total)"
                  erros={erros.percentual_sinal}
                  dica={`Valor do sinal: ${formatarMoeda(resumo.sinal)}`}
                >
                  {(aria) => (
                    <div className="grid gap-2">
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={String(percentualSinal)}
                          onChange={(e) => {
                            const n = Number(
                              e.target.value.replace(/\D/g, "").slice(0, 3),
                            );
                            setPercentualSinal(Math.min(n, 100));
                          }}
                          className={cn(CLASSE_CONTROLE, "pr-8 tabular-nums")}
                          {...aria}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {ATALHOS_SINAL.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPercentualSinal(p)}
                            aria-pressed={percentualSinal === p}
                            className={cn(
                              "h-8 flex-1 rounded-full border text-xs font-medium hover:bg-muted",
                              percentualSinal === p &&
                                "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CampoBase>

                <Campo
                  id="valido_ate"
                  rotulo="Válido até"
                  type="date"
                  value={validoAte}
                  onChange={(e) => setValidoAte(e.target.value)}
                  erros={erros.valido_ate}
                />
              </div>

              <CampoBase
                id="condicoes_pagamento"
                rotulo="Condições de pagamento (opcional)"
                erros={erros.condicoes_pagamento}
              >
                {(aria) => (
                  <Textarea
                    rows={2}
                    value={condicoes}
                    onChange={(e) => setCondicoes(e.target.value)}
                    placeholder="Ex.: Sinal via PIX e restante na conclusão do serviço."
                    className={cn(CLASSE_CONTROLE, "h-auto min-h-16")}
                    {...aria}
                  />
                )}
              </CampoBase>

              <CampoBase
                id="observacoes"
                rotulo="Observações (opcional)"
                erros={erros.observacoes}
              >
                {(aria) => (
                  <Textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex.: Material incluso. Prazo de execução: 3 dias úteis."
                    className={cn(CLASSE_CONTROLE, "h-auto min-h-20")}
                    {...aria}
                  />
                )}
              </CampoBase>
            </Secao>
          </CardContent>
        </Card>

        <div ref={mensagemRef}>
          <MensagemFormulario estado={estado} />
        </div>
      </div>

      {/* Computador: resumo na lateral, sempre visível */}
      <aside className="sticky top-20 hidden lg:block">
        <Card>
          <CardContent className="grid gap-4">
            <h2 className="font-semibold">Resumo</h2>
            <ResumoValores resumo={resumo} />
            <BotaoEnviar enviando={enviando} textoEnviando="Salvando...">
              <Save aria-hidden />
              {textoBotao}
            </BotaoEnviar>
          </CardContent>
        </Card>
      </aside>

      {/* Celular: barra fixa acima da navegação, sempre visível */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.15)] backdrop-blur md:bottom-0 lg:hidden">
        <ResumoValores resumo={resumo} compacto className="mb-3" />
        <BotaoEnviar enviando={enviando} textoEnviando="Salvando...">
          <Save aria-hidden />
          {textoBotao}
        </BotaoEnviar>
      </div>
    </form>
  );
}
