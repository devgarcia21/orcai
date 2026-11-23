"use client";

import Link from "next/link";

import { entrar } from "@/actions/auth";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { MensagemFormulario } from "@/components/formulario/mensagem-formulario";
import { useAcaoFormulario } from "@/hooks/use-acao-formulario";
import type { EstadoAcao } from "@/lib/acoes";
import { ROTAS } from "@/lib/rotas";

type Props = {
  /** Rota para onde voltar após entrar (vem do ?next= do proxy). */
  proximo?: string;
  /** Aviso vindo da URL, ex.: link de confirmação expirado. */
  avisoInicial?: string;
};

export function FormularioLogin({ proximo, avisoInicial }: Props) {
  const { estado, enviando, onSubmit } = useAcaoFormulario(entrar);
  const erros = estado.errosCampos ?? {};
  const estadoExibido: EstadoAcao =
    estado.status === "inicial" && avisoInicial
      ? { status: "erro", mensagem: avisoInicial }
      : estado;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <MensagemFormulario estado={estadoExibido} />
      {proximo && <input type="hidden" name="next" value={proximo} />}

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
        autoComplete="current-password"
        erros={erros.senha}
        required
      />

      <BotaoEnviar enviando={enviando} textoEnviando="Entrando...">
        Entrar
      </BotaoEnviar>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href={ROTAS.cadastro} className="font-medium text-primary hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </form>
  );
}
