"use client";

import { useEffect, useRef, useState } from "react";

import { salvarCliente } from "@/actions/clientes";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo, CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Textarea } from "@/components/ui/textarea";
import { useAcaoFormulario } from "@/hooks/use-acao-formulario";
import type { EstadoAcao } from "@/lib/acoes";
import { formatarTelefone } from "@/lib/formatacao";
import type { Cliente } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Props = {
  /** Cliente a editar; sem ele, o formulário cadastra um novo. */
  cliente?: Cliente;
  aoSalvar?: (cliente: Cliente) => void;
};

export function FormularioCliente({ cliente, aoSalvar }: Props) {
  const { estado, enviando, onSubmit } = useAcaoFormulario<Cliente>(salvarCliente);
  const erros = estado.errosCampos ?? {};
  const [telefone, setTelefone] = useState(formatarTelefone(cliente?.telefone ?? ""));

  // Avisa quem abriu o formulário assim que o cliente é salvo (uma vez por envio).
  const ultimoAvisado = useRef<EstadoAcao<Cliente> | null>(null);
  useEffect(() => {
    if (estado.status === "sucesso" && estado.dados && ultimoAvisado.current !== estado) {
      ultimoAvisado.current = estado;
      aoSalvar?.(estado.dados);
    }
  }, [estado, aoSalvar]);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <Campo
        id="nome"
        rotulo="Nome do cliente"
        autoComplete="off"
        placeholder="Ex.: Maria Souza"
        defaultValue={cliente?.nome}
        erros={erros.nome}
        required
        autoFocus
      />
      <Campo
        id="telefone"
        rotulo="Telefone / WhatsApp"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        placeholder="(11) 98765-4321"
        value={telefone}
        onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
        erros={erros.telefone}
      />
      <Campo
        id="email"
        rotulo="E-mail (opcional)"
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="cliente@exemplo.com"
        defaultValue={cliente?.email ?? ""}
        erros={erros.email}
      />
      <Campo
        id="endereco"
        rotulo="Endereço (opcional)"
        autoComplete="off"
        placeholder="Rua, número, bairro"
        defaultValue={cliente?.endereco ?? ""}
        erros={erros.endereco}
      />
      <CampoBase
        id="observacoes"
        rotulo="Observações (opcional)"
        erros={erros.observacoes}
      >
        {(aria) => (
          <Textarea
            name="observacoes"
            rows={3}
            defaultValue={cliente?.observacoes ?? ""}
            placeholder="Ex.: prefere contato à tarde"
            className={cn(CLASSE_CONTROLE, "h-auto min-h-20")}
            {...aria}
          />
        )}
      </CampoBase>

      {estado.status === "erro" && <MensagemFormulario estado={estado} />}

      <BotaoEnviar enviando={enviando} textoEnviando="Salvando...">
        {cliente ? "Salvar alterações" : "Cadastrar cliente"}
      </BotaoEnviar>
    </form>
  );
}
