"use client";

import { CircleCheck, Undo2 } from "lucide-react";
import { useState } from "react";

import { definirSinalRecebido } from "@/actions/orcamentos";
import { ConfirmarAcao } from "@/components/comum/confirmar-acao";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Button } from "@/components/ui/button";
import type { EstadoAcao } from "@/lib/acoes";

/** "Marcar sinal como recebido" e "Desfazer", ambos com confirmação. */
export function AcoesSinal({
  orcamentoId,
  recebido,
  valor,
}: {
  orcamentoId: string;
  recebido: boolean;
  /** Ex.: "R$ 112,50" — aparece na confirmação para evitar engano. */
  valor: string | null;
}) {
  const [resultado, setResultado] = useState<EstadoAcao<unknown> | null>(null);

  return (
    <div className="grid gap-2">
      {resultado && <MensagemFormulario estado={resultado} />}
      {recebido ? (
        <ConfirmarAcao
          gatilho={
            <Button type="button" variant="outline" className="h-11 w-full sm:w-auto">
              <Undo2 aria-hidden />
              Desfazer
            </Button>
          }
          titulo="Desfazer o recebimento do sinal?"
          descricao="Use se marcou por engano. O orçamento volta a aparecer como aguardando o sinal, e o cliente volta a ver o QR Code para pagar."
          textoConfirmar="Sim, desfazer"
          destrutivo
          aoConfirmar={() => definirSinalRecebido(orcamentoId, false)}
          aoConcluir={setResultado}
        />
      ) : (
        <ConfirmarAcao
          gatilho={
            <Button
              type="button"
              className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700 [&_svg]:text-white"
            >
              <CircleCheck aria-hidden />
              Marcar sinal como recebido
            </Button>
          }
          titulo="Confirmar o recebimento do sinal?"
          descricao={`Confira no extrato do seu banco se o PIX${valor ? ` de ${valor}` : ""} realmente caiu na sua conta. O cliente verá “Sinal recebido”.`}
          textoConfirmar="Sim, recebi"
          aoConfirmar={() => definirSinalRecebido(orcamentoId, true)}
          aoConcluir={setResultado}
        />
      )}
    </div>
  );
}
