import "server-only";

import { ProvedorGemini } from "./gemini";
import type { ProvedorIA } from "./provedor";

/**
 * Modelo padrão: Flash-Lite estável, disponível no plano gratuito da API do
 * Gemini (rápido e barato — a tarefa é só estruturar uma lista de itens).
 * Para trocar, defina GEMINI_MODEL no .env.local (ex.: gemini-3.8-flash).
 */
export const MODELO_GEMINI_PADRAO = "gemini-3.5-flash-lite";

type Ambiente = Record<string, string | undefined>;

/**
 * Provedor de IA configurado, ou `null` se não houver chave — nesse caso a
 * função "Montar com IA" aparece desativada e o resto do app segue normal.
 *
 * As variáveis NÃO têm prefixo NEXT_PUBLIC: nunca vão para o navegador.
 */
export function obterProvedorIA(ambiente: Ambiente = process.env): ProvedorIA | null {
  const chave = ambiente.GEMINI_API_KEY?.trim();
  if (!chave) return null;
  const modelo = ambiente.GEMINI_MODEL?.trim() || MODELO_GEMINI_PADRAO;
  return new ProvedorGemini(chave, modelo);
}

/** Só diz SE a IA está configurada (para a tela); nunca expõe a chave. */
export function iaConfigurada(ambiente: Ambiente = process.env): boolean {
  return Boolean(ambiente.GEMINI_API_KEY?.trim());
}
