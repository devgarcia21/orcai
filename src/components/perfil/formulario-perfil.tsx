"use client";

import { useState } from "react";

import { salvarPerfil } from "@/actions/perfil";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo, CampoBase, CLASSE_CONTROLE } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { useAcaoFormulario } from "@/hooks/use-acao-formulario";
import { formatarChavePix, formatarTelefone } from "@/lib/formatacao";
import { OPCOES_CHAVE_PIX } from "@/lib/pix";
import { TIPOS_CHAVE_PIX, type Prestador, type TipoChavePix } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { CampoLogo } from "./campo-logo";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormularioPerfil({ prestador }: { prestador: Prestador }) {
  const { estado, enviando, onSubmit } = useAcaoFormulario(salvarPerfil);
  const erros = estado.errosCampos ?? {};

  // Campos controlados por causa das máscaras.
  const [telefone, setTelefone] = useState(formatarTelefone(prestador.telefone ?? ""));
  const [tipoPix, setTipoPix] = useState<TipoChavePix | "">(
    prestador.tipo_chave_pix ?? "",
  );
  const [chavePix, setChavePix] = useState(
    formatarChavePix(prestador.tipo_chave_pix ?? "", prestador.chave_pix ?? ""),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8">
      <Secao titulo="Seus dados">
        <Campo
          id="nome"
          rotulo="Seu nome"
          autoComplete="name"
          defaultValue={prestador.nome}
          erros={erros.nome}
          required
        />
        <Campo
          id="nome_empresa"
          rotulo="Nome da empresa (opcional)"
          autoComplete="organization"
          placeholder="Ex.: Silva Elétrica"
          defaultValue={prestador.nome_empresa ?? ""}
          erros={erros.nome_empresa}
        />
        <Campo
          id="telefone"
          rotulo="Telefone / WhatsApp"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          erros={erros.telefone}
        />
        <Campo
          id="cidade"
          rotulo="Cidade"
          autoComplete="address-level2"
          placeholder="Ex.: Campinas - SP"
          defaultValue={prestador.cidade ?? ""}
          erros={erros.cidade}
        />
      </Secao>

      <Secao titulo="Recebimento via PIX">
        <CampoBase
          id="tipo_chave_pix"
          rotulo="Tipo de chave PIX"
          erros={erros.tipo_chave_pix}
        >
          {(aria) => (
            <select
              name="tipo_chave_pix"
              value={tipoPix}
              onChange={(e) => {
                const novoTipo = e.target.value as TipoChavePix | "";
                setTipoPix(novoTipo);
                setChavePix((atual) => formatarChavePix(novoTipo, atual));
              }}
              className={cn(
                CLASSE_CONTROLE,
                "w-full rounded-lg border border-input bg-background px-2.5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
              )}
              {...aria}
            >
              <option value="">Selecione...</option>
              {TIPOS_CHAVE_PIX.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {OPCOES_CHAVE_PIX[tipo].rotulo}
                </option>
              ))}
            </select>
          )}
        </CampoBase>
        <Campo
          id="chave_pix"
          rotulo="Chave PIX"
          placeholder={
            tipoPix ? OPCOES_CHAVE_PIX[tipoPix].placeholder : "Escolha o tipo primeiro"
          }
          inputMode={
            tipoPix === "cpf" || tipoPix === "cnpj" || tipoPix === "telefone"
              ? "numeric"
              : tipoPix === "email"
                ? "email"
                : "text"
          }
          autoCapitalize="none"
          value={chavePix}
          onChange={(e) => setChavePix(formatarChavePix(tipoPix, e.target.value))}
          disabled={!tipoPix}
          erros={erros.chave_pix}
          dica="É para esta chave que seus clientes vão pagar o sinal."
        />
      </Secao>

      <Secao titulo="Identidade visual">
        {/* key: ao salvar uma logo nova, o campo reinicia e limpa a seleção. */}
        <CampoLogo
          key={prestador.logo_url ?? "sem-logo"}
          logoAtual={prestador.logo_url}
          erros={erros.logo}
        />
      </Secao>

      <div className="grid gap-4">
        <MensagemFormulario estado={estado} />
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Salvando..."
          className="sm:w-auto sm:justify-self-start sm:px-8"
        >
          Salvar perfil
        </BotaoEnviar>
      </div>
    </form>
  );
}
