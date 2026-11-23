/**
 * Tipos do banco escritos à mão para a Etapa 1.
 * Quando o schema crescer, gere automaticamente com:
 *   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 */

export const TIPOS_CHAVE_PIX = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;
export type TipoChavePix = (typeof TIPOS_CHAVE_PIX)[number];

export type Prestador = {
  id: string;
  nome: string;
  nome_empresa: string | null;
  telefone: string | null;
  cidade: string | null;
  tipo_chave_pix: TipoChavePix | null;
  chave_pix: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PrestadorAtualizacao = Partial<
  Omit<Prestador, "id" | "created_at" | "updated_at">
>;
