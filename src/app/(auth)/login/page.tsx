import type { Metadata } from "next";
import { Suspense } from "react";

import { CartaoAuth } from "@/components/auth/cartao-auth";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { destinoSeguro } from "@/lib/rotas";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  "link-invalido":
    "O link de confirmação é inválido ou expirou. Entre com seu e-mail e senha ou cadastre-se de novo.",
};

/** Lê ?next= e ?erro= da URL (dado de requisição, por isso fica em Suspense). */
async function LoginComParametros({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { next, erro } = await searchParams;
  const proximo = typeof next === "string" ? destinoSeguro(next) : undefined;
  const aviso = typeof erro === "string" ? AVISOS[erro] : undefined;
  return <FormularioLogin proximo={proximo} avisoInicial={aviso} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <CartaoAuth
      titulo="Entrar"
      descricao="Acesse sua conta para criar e enviar orçamentos."
    >
      <Suspense fallback={<FormularioLogin />}>
        <LoginComParametros searchParams={searchParams} />
      </Suspense>
    </CartaoAuth>
  );
}
