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
  /** Segredo do link público (/o/[token]); null até o primeiro envio. */
  token_publico: string | null;
  enviado_em: string | null;
  visualizado_em: string | null;
  respondido_em: string | null;
  motivo_recusa: string | null;
  /** Marcado à mão pelo prestador (QR Code estático, sem gateway). Só em aprovados. */
  sinal_recebido_em: string | null;
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
  | "id"
  | "numero"
  | "titulo"
  | "status"
  | "created_at"
  | "cliente_id"
  | "visualizado_em"
  | "sinal_recebido_em"
  | "valido_ate"
> & {
  cliente_nome: string;
  total_centavos: number;
  /** "vencido" quando enviado e fora da validade (só exibição; calculado no servidor). */
  status_exibicao: StatusOrcamento | "vencido";
};

/** Cliente com a quantidade de orçamentos (para bloquear a exclusão). */
export type ClienteComContagem = Cliente & { total_orcamentos: number };

// --- Documento (PDF e páginas de visualização) ------------------------------

/**
 * O mínimo para exibir um orçamento (PDF, lista de itens, resumo).
 * Atendido tanto por OrcamentoCompleto (painel) quanto por OrcamentoPublico.
 */
export type OrcamentoDocumento = Pick<
  Orcamento,
  | "numero"
  | "titulo"
  | "created_at"
  | "valido_ate"
  | "desconto_centavos"
  | "percentual_sinal"
  | "condicoes_pagamento"
  | "observacoes"
> & {
  cliente: Pick<Cliente, "nome" | "telefone" | "email" | "endereco">;
  itens: Pick<
    ItemOrcamento,
    "descricao" | "quantidade" | "unidade" | "valor_unitario_centavos"
  >[];
};

/** Dados públicos do prestador (o que o cliente pode ver). */
export type PrestadorPublico = Pick<
  Prestador,
  | "nome"
  | "nome_empresa"
  | "telefone"
  | "cidade"
  | "logo_url"
  | "tipo_chave_pix"
  | "chave_pix"
>;

// --- Link público ------------------------------------------------------------

/** Retorno de obter_orcamento_publico (migration 003): sem ids internos. */
export type OrcamentoPublico = OrcamentoDocumento &
  Pick<Orcamento, "status" | "enviado_em" | "respondido_em"> & {
    /** Calculado no banco com a data de hoje no Brasil. */
    vencido: boolean;
    /** O prestador já marcou o sinal como recebido (migration 004). */
    sinal_recebido: boolean;
    /** 8 caracteres aleatórios e estáveis do orçamento, para o txid do PIX. */
    referencia_pix: string;
    prestador: PrestadorPublico;
  };

export const ACOES_RESPOSTA = ["aprovar", "recusar"] as const;
export type AcaoResposta = (typeof ACOES_RESPOSTA)[number];

// --- Uso da IA (migration 005) -----------------------------------------------

/** Uma geração de itens com IA (só leitura para o prestador; escrita por funções). */
export type UsoIa = {
  id: string;
  prestador_id: string;
  criado_em: string;
  tokens_entrada: number;
  tokens_saida: number;
  sucesso: boolean;
  concluido: boolean;
};

/** Retorno de reservar_uso_ia: se a geração cabe no limite da janela. */
export type ReservaUsoIa = {
  permitido: boolean;
  usos: number;
  /** Quando a próxima vaga abre (só quando bloqueado). */
  liberado_em: string | null;
  /** Id do uso reservado (só quando permitido). */
  uso_id: string | null;
};
