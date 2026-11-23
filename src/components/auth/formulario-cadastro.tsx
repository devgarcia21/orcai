"use client";

import Link from "next/link";

import { cadastrar } from "@/actions/auth";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { useAcaoFormulario } from "@/hooks/use-acao-formulario";
import { ROTAS } from "@/lib/rotas";

export function FormularioCadastro() {
  const { estado, enviando, onSubmit } = useAcaoFormulario(cadastrar);
  const erros = estado.errosCampos ?? {};

  if (estado.status === "sucesso") {
    return (
      <div className="grid gap-4">
        <MensagemFormulario estado={estado} />
        <p className="text-center text-sm text-muted-foreground">
          Já confirmou?{" "}
          <Link href={ROTAS.login} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <MensagemFormulario estado={estado} />

      <Campo
        id="nome"
        rotulo="Seu nome"
        autoComplete="name"
        placeholder="João da Silva"
        erros={erros.nome}
        required
      />
      <Campo
        id="email"
        rotulo="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        erros={erros.email}
        required
      />
      <Campo
        id="senha"
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        dica="Mínimo de 8 caracteres."
        erros={erros.senha}
        required
        minLength={8}
      />

      <BotaoEnviar enviando={enviando} textoEnviando="Criando conta...">
        Criar conta grátis
      </BotaoEnviar>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href={ROTAS.login} className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
