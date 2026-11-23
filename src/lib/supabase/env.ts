/**
 * Lê as variáveis públicas do Supabase com uma mensagem de erro clara
 * caso o .env.local ainda não tenha sido preenchido.
 *
 * Os acessos precisam ser literais (process.env.NEXT_PUBLIC_...) para que o
 * Next.js consiga embutir os valores no bundle do navegador.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase não configurado: preencha NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local e reinicie o servidor.",
    );
  }

  return { url, publishableKey };
}
