import { z } from "zod";

/** Gerações com IA por prestador, por hora (conferido no banco: reservar_uso_ia). */
export const LIMITE_GERACOES_POR_HORA = 30;
/** Tamanho máximo do texto enviado à IA. */
export const TEXTO_MAXIMO_IA = 1500;
/** Tempo máximo de uma chamada à IA. */
export const TIMEOUT_IA_MS = 30_000;

/** Texto do pedido: mesma regra no contador da tela e na Server Action. */
export const textoPedidoIaSchema = z
  .string({ error: "Descreva o serviço." })
  .trim()
  .min(3, "Descreva o serviço, ex.: trocar 3 tomadas e instalar um chuveiro.")
  .max(
    TEXTO_MAXIMO_IA,
    `Use no máximo ${TEXTO_MAXIMO_IA.toLocaleString("pt-BR")} caracteres.`,
  );

/**
 * Mensagem quando o prestador passa do limite por hora.
 * `liberadoEm` vem do banco: quando o uso mais antigo da janela sai dela.
 */
export function mensagemLimiteAtingido(liberadoEm: string | null, agora: Date): string {
  const inicio = `Você atingiu o limite de ${LIMITE_GERACOES_POR_HORA} gerações com IA por hora.`;
  const ms = liberadoEm ? new Date(liberadoEm).getTime() - agora.getTime() : NaN;
  if (!Number.isFinite(ms) || ms <= 60_000) {
    return `${inicio} Tente novamente em instantes.`;
  }
  const minutos = Math.ceil(ms / 60_000);
  return `${inicio} Tente novamente em ${minutos} minutos.`;
}
