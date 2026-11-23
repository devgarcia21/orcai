/**
 * Tipos do banco, centralizados e escritos à mão (espelham supabase/migrations).
 * Quando o schema crescer, gere automaticamente com:
 *   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 *
 * Dinheiro: sempre em centavos (number inteiro). Datas "date": string "AAAA-MM-DD".
 */

// --- Prestadores -------------------------------------------------------------

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

// --- Clientes ----------------------------------------------------------------

export type Cliente = {
  id: string;
  prestador_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

/** Campos editáveis de um cliente. */
export type ClienteDados = Pick<
  Cliente,
  "nome" | "telefone" | "email" | "endereco" | "observacoes"
>;

// --- Orçamentos --------------------------------------------------------------

export const STATUS_ORCAMENTO = ["rascunho", "enviado", "aprovado", "recusado"] as const;
export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number];

export const UNIDADES_ITEM = ["un", "m", "m2", "m3", "h", "dia", "servico"] as const;
export type UnidadeItem = (typeof UNIDADES_ITEM)[number];

export type Orcamento = {
  id: string;
  prestador_id: string;
  cliente_id: string;
  numero: number;
  titulo: string;
  status: StatusOrcamento;
  desconto_centavos: number;
  percentual_sinal: number;
  valido_ate: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemOrcamento = {
  id: string;
  orcamento_id: string;
  descricao: string;
  /** numeric(10,2): o PostgREST pode devolver como number ou string. */
  quantidade: number;
  unidade: UnidadeItem;
  valor_unitario_centavos: number;
  ordem: number;
  created_at: string;
};

/** Orçamento completo, como exibido na página de detalhes e no formulário. */
export type OrcamentoCompleto = Orcamento & {
  cliente: Cliente;
  itens: ItemOrcamento[];
};

/** Linha das listagens: orçamento + nome do cliente + total já calculado. */
export type OrcamentoResumo = Pick<
  Orcamento,
  "id" | "numero" | "titulo" | "status" | "created_at" | "cliente_id"
> & {
  cliente_nome: string;
  total_centavos: number;
};

/** Cliente com a quantidade de orçamentos (para bloquear a exclusão). */
export type ClienteComContagem = Cliente & { total_orcamentos: number };
