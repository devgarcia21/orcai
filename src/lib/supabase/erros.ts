import type { AuthError, PostgrestError } from "@supabase/supabase-js";

/**
 * Traduz erros do Postgres/PostgREST. As exceções levantadas pelas nossas
 * funções SQL (raise exception 'orcamento_finalizado') chegam em `message`.
 */
const MENSAGENS_BANCO: Record<string, string> = {
  orcamento_finalizado:
    "Este orçamento já foi aprovado ou recusado e não pode mais ser alterado. Duplique-o para criar um novo.",
  orcamento_nao_encontrado: "Orçamento não encontrado.",
  orcamento_sem_itens: "Adicione pelo menos um item ao orçamento.",
};

/**
 * Violação de chave estrangeira: 23503 (foreign_key_violation) ou 23001
 * (restrict_violation, devolvido por "on delete restrict").
 */
export function violouChaveEstrangeira(error: PostgrestError): boolean {
  return error.code === "23503" || error.code === "23001";
}

export function traduzirErroBanco(error: PostgrestError, padrao: string): string {
  if (MENSAGENS_BANCO[error.message]) return MENSAGENS_BANCO[error.message];
  if (violouChaveEstrangeira(error)) {
    return "Este registro está sendo usado em outro lugar e não pode ser alterado ou excluído.";
  }
  if (error.code === "PGRST202") {
    return "O banco ainda não foi atualizado. Rode a migration 002 no SQL Editor do Supabase.";
  }
  return padrao;
}

/** Traduz os erros mais comuns do Supabase Auth para mensagens em português. */
const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  email_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  over_email_send_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  email_address_invalid: "Este endereço de e-mail não é aceito. Tente outro.",
};

export function traduzirErroAuth(error: AuthError): string {
  return (
    (error.code && MENSAGENS[error.code]) ||
    "Não foi possível concluir agora. Verifique sua conexão e tente novamente."
  );
}
