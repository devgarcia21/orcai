import type { Prestador } from "@/lib/types/database";

/** O que falta no perfil para enviar orçamentos com PIX (telefone, chave e cidade). */
export function pendenciasPerfil(
  prestador: Pick<Prestador, "telefone" | "chave_pix" | "cidade">,
): string[] {
  return [
    !prestador.telefone && "telefone",
    !prestador.chave_pix && "chave PIX",
    !prestador.cidade?.trim() && "cidade (obrigatória no QR Code PIX)",
  ].filter((p): p is string => Boolean(p));
}

/** Perfil pronto para gerar orçamentos com QR Code PIX. */
export function perfilCompleto(
  prestador: Pick<Prestador, "telefone" | "chave_pix" | "cidade">,
): boolean {
  return pendenciasPerfil(prestador).length === 0;
}

/** Nome exibido no cabeçalho e no PDF: empresa, se houver; senão o nome do prestador. */
export function nomeDeExibicao(
  prestador: Pick<Prestador, "nome" | "nome_empresa">,
): string {
  return prestador.nome_empresa || prestador.nome || "Meu negócio";
}
