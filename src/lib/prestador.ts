import type { Prestador } from "@/lib/types/database";

/** Perfil pronto para gerar orçamentos: precisa de telefone e chave PIX. */
export function perfilCompleto(
  prestador: Pick<Prestador, "telefone" | "chave_pix">,
): boolean {
  return Boolean(prestador.telefone && prestador.chave_pix);
}

/** Nome exibido no cabeçalho e no PDF: empresa, se houver; senão o nome do prestador. */
export function nomeDeExibicao(
  prestador: Pick<Prestador, "nome" | "nome_empresa">,
): string {
  return prestador.nome_empresa || prestador.nome || "Meu negócio";
}
