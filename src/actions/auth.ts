"use server";

import { redirect } from "next/navigation";

import { erro, erroDeValidacao, sucesso, type EstadoAcao } from "@/lib/acoes";
import { destinoSeguro, ROTAS } from "@/lib/rotas";
import { traduzirErroAuth } from "@/lib/supabase/erros";
import { createClient } from "@/lib/supabase/server";
import { urlDoSite } from "@/lib/url-site";
import { cadastroSchema, loginSchema } from "@/lib/validacoes/auth";

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

export async function cadastrar(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const parsed = cadastroSchema.safeParse({
    nome: texto(formData, "nome"),
    email: texto(formData, "email"),
    senha: texto(formData, "senha"),
  });
  if (!parsed.success) return erroDeValidacao(parsed.error);

  const { nome, email, senha } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },
      emailRedirectTo: `${await urlDoSite()}${ROTAS.authCallback}`,
    },
  });

  if (error) return erro(traduzirErroAuth(error));

  // Com confirmação de e-mail ligada, o Supabase não revela se o e-mail já
  // existe: devolve um usuário sem identidades.
  if (data.user && data.user.identities?.length === 0) {
    return erro("Já existe uma conta com este e-mail. Tente entrar.");
  }

  // Confirmação de e-mail desligada: a sessão já vem pronta.
  if (data.session) redirect(ROTAS.painel);

  return sucesso(
    `Conta criada! Enviamos um link de confirmação para ${email}. Abra-o para entrar no Orçaí.`,
  );
}

export async function entrar(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const parsed = loginSchema.safeParse({
    email: texto(formData, "email"),
    senha: texto(formData, "senha"),
  });
  if (!parsed.success) return erroDeValidacao(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (error) return erro(traduzirErroAuth(error));

  redirect(destinoSeguro(formData.get("next")));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROTAS.login);
}
