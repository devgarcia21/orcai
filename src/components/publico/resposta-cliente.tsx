"use client";

import { Check, CircleCheck, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { responderOrcamento } from "@/actions/publico";
import { ConfirmarAcao } from "@/components/comum/confirmar-acao";
import { CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoAcao } from "@/lib/acoes";
import type { StatusOrcamento } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Resposta = EstadoAcao<{ status: StatusOrcamento }>;

const MAXIMO_MOTIVO = 500;

function DialogoRecusa({
  token,
  aoResponder,
}: {
  token: string;
  aoResponder: (r: Resposta) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<Resposta | null>(null);
  const [enviando, iniciar] = useTransition();

  function recusar() {
    iniciar(async () => {
      const r = await responderOrcamento(token, "recusar", motivo);
      if (r.status === "sucesso") {
        setAberto(false);
        aoResponder(r);
      } else {
        setErro(r);
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !enviando && setAberto(abrir)}>
      <DialogTrigger
        render={
          <Button type="button" size="lg" variant="outline" className="h-12 text-base">
            <X aria-hidden />
            Recusar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar o orçamento</DialogTitle>
          <DialogDescription>
            Tudo bem! Se quiser, conte o motivo — ajuda o prestador a melhorar a proposta.
          </DialogDescription>
        </DialogHeader>

        <CampoBase
          id="motivo"
          rotulo="Quer dizer o motivo? (opcional)"
          erros={erro?.errosCampos?.motivo}
          dica={`${motivo.length}/${MAXIMO_MOTIVO} caracteres`}
        >
          {(aria) => (
            <Textarea
              rows={3}
              value={motivo}
              maxLength={MAXIMO_MOTIVO}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Achei o valor acima do esperado."
              className={cn(CLASSE_CONTROLE, "h-auto min-h-24")}
              {...aria}
            />
          )}
        </CampoBase>

        {erro && !erro.errosCampos?.motivo && <MensagemFormulario estado={erro} />}

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            onClick={recusar}
            disabled={enviando}
          >
            {enviando && <Loader2 className="animate-spin" aria-hidden />}
            Enviar recusa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  token: string;
  /** Enviado e dentro da validade (regra do servidor). */
  podeResponder: boolean;
};

/**
 * Aprovar / Recusar. Fica sempre na mesma posição da página: assim, quando a
 * página recarrega com o novo status, a mensagem de confirmação continua aqui.
 */
export function RespostaCliente({ token, podeResponder }: Props) {
  const [resposta, setResposta] = useState<Resposta | null>(null);

  if (resposta?.status === "sucesso") {
    const aprovado = resposta.dados?.status === "aprovado";
    return (
      <Alert
        aria-live="polite"
        className={cn(
          "py-4",
          aprovado
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 *:data-[slot=alert-description]:text-emerald-900"
            : "border-border bg-card",
        )}
      >
        <CircleCheck />
        <AlertTitle className="text-base">
          {aprovado ? "Orçamento aprovado!" : "Resposta enviada"}
        </AlertTitle>
        <AlertDescription>
          {aprovado
            ? "O prestador já foi avisado."
            : "O prestador já foi avisado. Obrigado por responder!"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!podeResponder) return null;

  return (
    // No celular, a barra de resposta fica fixa embaixo enquanto o cliente lê.
    <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.15)] backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:p-4 sm:shadow-none">
      <p className="mb-3 text-sm font-medium">O que você achou do orçamento?</p>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <ConfirmarAcao
          gatilho={
            <Button
              type="button"
              size="lg"
              className="h-12 bg-emerald-600 text-base text-white hover:bg-emerald-700 [&_svg]:text-white"
            >
              <Check aria-hidden />
              Aprovar orçamento
            </Button>
          }
          titulo="Aprovar este orçamento?"
          descricao="O prestador será avisado de que você aprovou e poderá combinar o início do serviço com você."
          textoConfirmar="Sim, aprovar"
          aoConfirmar={() => responderOrcamento(token, "aprovar")}
          aoConcluir={(r) => setResposta(r as Resposta)}
        />
        <DialogoRecusa token={token} aoResponder={setResposta} />
      </div>
    </div>
  );
}
