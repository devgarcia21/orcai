export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  painel: "/painel",
  perfil: "/painel/perfil",
  clientes: "/painel/clientes",
  orcamentos: "/painel/orcamentos",
  novoOrcamento: "/painel/orcamentos/novo",
  authCallback: "/auth/callback",
} as const;

export const rotaCliente = (id: string) => `${ROTAS.clientes}/${id}`;
export const rotaOrcamento = (id: string) => `${ROTAS.orcamentos}/${id}`;
export const rotaEditarOrcamento = (id: string) => `${ROTAS.orcamentos}/${id}/editar`;
/** Novo orçamento já com o cliente escolhido. */
export const rotaNovoOrcamentoPara = (clienteId: string) =>
  `${ROTAS.novoOrcamento}?cliente=${clienteId}`;

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

/** PDF do orçamento; com download=true o navegador baixa em vez de abrir. */
export const rotaPdfOrcamento = (id: string, download = false) =>
  `${ROTAS.orcamentos}/${id}/pdf${download ? "?download=1" : ""}`;

/** Página pública do orçamento (para o cliente, sem login). */
export const rotaPublicaOrcamento = (token: string) => `/o/${token}`;
export const rotaPdfPublico = (token: string, download = false) =>
  `/o/${token}/pdf${download ? "?download=1" : ""}`;

/** Formato do token público (base64url, 32 caracteres) — evita consultas com lixo. */
export const tokenPublicoValido = (token: string) => /^[A-Za-z0-9_-]{20,64}$/.test(token);
