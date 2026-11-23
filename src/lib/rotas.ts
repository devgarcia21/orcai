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
