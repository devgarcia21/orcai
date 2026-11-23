export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  painel: "/painel",
  perfil: "/painel/perfil",
  authCallback: "/auth/callback",
} as const;

/**
 * Garante que o redirecionamento pós-login seja sempre interno ao site,
 * evitando "open redirect" (ex.: ?next=//site-malicioso.com).
 */
export function destinoSeguro(next: unknown, padrao: string = ROTAS.painel): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return padrao;
  }
  if (next.startsWith("/\\")) return padrao;
  return next;
}
