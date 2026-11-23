import type { AuthError } from "@supabase/supabase-js";

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
