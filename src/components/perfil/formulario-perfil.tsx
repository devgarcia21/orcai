"use client";

import { useState } from "react";

import { salvarPerfil } from "@/actions/perfil";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo, CampoBase } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { Secao } from "@/components/formulario/secao";
import { SelectNativo } from "@/components/formulario/select-nativo";
import { useAcaoFormulario } from "@/hooks/use-acao-formulario";
import { formatarChavePix, formatarTelefone } from "@/lib/formatacao";
import { OPCOES_CHAVE_PIX } from "@/lib/pix/chave";
import { TIPOS_CHAVE_PIX, type Prestador, type TipoChavePix } from "@/lib/types/database";

import { CampoLogo } from "./campo-logo";

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
          dica={
            prestador.cidade ? (
              "Aparece no QR Code PIX dos seus orçamentos."
            ) : (
              <span className="font-medium text-amber-700">
                Preencha a cidade: ela é obrigatória para gerar o QR Code PIX.
              </span>
            )
          }
        />
      </Secao>

      <Secao titulo="Recebimento via PIX">
        <CampoBase
          id="tipo_chave_pix"
          rotulo="Tipo de chave PIX"
          erros={erros.tipo_chave_pix}
        >
          {(aria) => (
            <SelectNativo
              name="tipo_chave_pix"
              value={tipoPix}
              onChange={(e) => {
                const novoTipo = e.target.value as TipoChavePix | "";
                setTipoPix(novoTipo);
                setChavePix((atual) => formatarChavePix(novoTipo, atual));
              }}
              {...aria}
            >
              <option value="">Selecione...</option>
              {TIPOS_CHAVE_PIX.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {OPCOES_CHAVE_PIX[tipo].rotulo}
                </option>
              ))}
            </SelectNativo>
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
