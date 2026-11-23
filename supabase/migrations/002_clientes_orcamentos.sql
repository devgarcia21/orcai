-- =============================================================================
-- Orçaí — Migration 002: clientes, orçamentos e itens
-- Pré-requisito: 001_inicial.sql já executado.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
--
-- Dinheiro é SEMPRE guardado em centavos (integer). Nunca use float para valores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clientes
-- -----------------------------------------------------------------------------
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null default auth.uid()
                references public.prestadores (id) on delete cascade,
  nome          text not null check (length(trim(nome)) > 0),
  telefone      text,
  email         text,
  endereco      text,
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Alvo da FK composta de orcamentos: garante que o cliente de um orçamento
  -- pertence ao mesmo prestador do orçamento.
  constraint clientes_id_prestador_key unique (id, prestador_id)
);

comment on table public.clientes is 'Clientes de cada prestador.';

create index if not exists clientes_prestador_id_idx on public.clientes (prestador_id);

-- -----------------------------------------------------------------------------
-- 2. Contador de numeração dos orçamentos (por prestador)
--    Um contador evita reaproveitar números quando um orçamento é excluído
--    e serializa inserções simultâneas (lock na linha do prestador).
-- -----------------------------------------------------------------------------
alter table public.prestadores
  add column if not exists ultimo_numero_orcamento integer not null default 0;

-- -----------------------------------------------------------------------------
-- 3. Orçamentos
-- -----------------------------------------------------------------------------
create table if not exists public.orcamentos (
  id                  uuid primary key default gen_random_uuid(),
  prestador_id        uuid not null default auth.uid()
                      references public.prestadores (id) on delete cascade,
  cliente_id          uuid not null,
  numero              integer not null,
  titulo              text not null check (length(trim(titulo)) > 0),
  status              text not null default 'rascunho'
                      check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  desconto_centavos   integer not null default 0 check (desconto_centavos >= 0),
  percentual_sinal    integer not null default 0 check (percentual_sinal between 0 and 100),
  valido_ate          date,
  condicoes_pagamento text,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint orcamentos_prestador_numero_key unique (prestador_id, numero),
  -- FK composta: o cliente precisa ser do mesmo prestador. "restrict" impede
  -- excluir um cliente que tenha orçamentos.
  constraint orcamentos_cliente_fkey foreign key (cliente_id, prestador_id)
    references public.clientes (id, prestador_id) on delete restrict
);

comment on table public.orcamentos is 'Orçamentos; numero é sequencial por prestador.';

create index if not exists orcamentos_prestador_id_idx on public.orcamentos (prestador_id);
create index if not exists orcamentos_cliente_id_idx on public.orcamentos (cliente_id, prestador_id);
create index if not exists orcamentos_status_idx on public.orcamentos (prestador_id, status);

-- -----------------------------------------------------------------------------
-- 4. Itens do orçamento
-- -----------------------------------------------------------------------------
create table if not exists public.itens_orcamento (
  id                      uuid primary key default gen_random_uuid(),
  orcamento_id            uuid not null references public.orcamentos (id) on delete cascade,
  descricao               text not null check (length(trim(descricao)) > 0),
  quantidade              numeric(10, 2) not null check (quantidade > 0),
  unidade                 text not null default 'un'
                          check (unidade in ('un', 'm', 'm2', 'm3', 'h', 'dia', 'servico')),
  valor_unitario_centavos integer not null check (valor_unitario_centavos >= 0),
  ordem                   integer not null default 0,
  created_at              timestamptz not null default now()
);

create index if not exists itens_orcamento_orcamento_id_idx
  on public.itens_orcamento (orcamento_id, ordem);

-- -----------------------------------------------------------------------------
-- 5. Triggers
-- -----------------------------------------------------------------------------

-- updated_at (função criada na migration 001)
drop trigger if exists clientes_updated_at on public.clientes;
create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.atualizar_updated_at();

drop trigger if exists orcamentos_updated_at on public.orcamentos;
create trigger orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.atualizar_updated_at();

-- Número sequencial por prestador: 1, 2, 3... (ignora qualquer valor enviado).
-- security definer: precisa atualizar o contador em prestadores.
create or replace function public.definir_numero_orcamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prestadores
     set ultimo_numero_orcamento = ultimo_numero_orcamento + 1
   where id = new.prestador_id
  returning ultimo_numero_orcamento into new.numero;

  if new.numero is null then
    raise exception 'Prestador % não encontrado', new.prestador_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orcamentos_definir_numero on public.orcamentos;
create trigger orcamentos_definir_numero
  before insert on public.orcamentos
  for each row execute function public.definir_numero_orcamento();

-- Regras de edição do orçamento:
--  - número e prestador nunca mudam;
--  - aprovados/recusados ficam congelados (só podem ser duplicados ou excluídos).
create or replace function public.proteger_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('aprovado', 'recusado') then
    raise exception 'orcamento_finalizado'
      using hint = 'Orçamentos aprovados ou recusados não podem ser alterados.';
  end if;
  new.numero = old.numero;
  new.prestador_id = old.prestador_id;
  return new;
end;
$$;

drop trigger if exists orcamentos_proteger on public.orcamentos;
create trigger orcamentos_proteger
  before update on public.orcamentos
  for each row execute function public.proteger_orcamento();

-- Excluir um orçamento (mesmo finalizado) é permitido: marcamos na transação
-- qual orçamento está sendo excluído para a cascata dos itens passar.
create or replace function public.marcar_exclusao_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('orcai.excluindo_orcamento', old.id::text, true);
  return old;
end;
$$;

drop trigger if exists orcamentos_marcar_exclusao on public.orcamentos;
create trigger orcamentos_marcar_exclusao
  before delete on public.orcamentos
  for each row execute function public.marcar_exclusao_orcamento();

-- Itens de orçamentos finalizados também não podem ser alterados.
create or replace function public.proteger_itens_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if tg_op = 'DELETE'
     and current_setting('orcai.excluindo_orcamento', true) = old.orcamento_id::text then
    return old;
  end if;

  select status into v_status
    from public.orcamentos
   where id = coalesce(new.orcamento_id, old.orcamento_id);

  if v_status in ('aprovado', 'recusado') then
    raise exception 'orcamento_finalizado'
      using hint = 'Orçamentos aprovados ou recusados não podem ser alterados.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists itens_orcamento_proteger on public.itens_orcamento;
create trigger itens_orcamento_proteger
  before insert or update or delete on public.itens_orcamento
  for each row execute function public.proteger_itens_orcamento();

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
alter table public.clientes enable row level security;
alter table public.orcamentos enable row level security;
alter table public.itens_orcamento enable row level security;

-- Clientes: só os do próprio prestador
drop policy if exists "Clientes: ver os próprios" on public.clientes;
create policy "Clientes: ver os próprios"
  on public.clientes for select to authenticated
  using ((select auth.uid()) = prestador_id);

drop policy if exists "Clientes: criar os próprios" on public.clientes;
create policy "Clientes: criar os próprios"
  on public.clientes for insert to authenticated
  with check ((select auth.uid()) = prestador_id);

drop policy if exists "Clientes: editar os próprios" on public.clientes;
create policy "Clientes: editar os próprios"
  on public.clientes for update to authenticated
  using ((select auth.uid()) = prestador_id)
  with check ((select auth.uid()) = prestador_id);

drop policy if exists "Clientes: apagar os próprios" on public.clientes;
create policy "Clientes: apagar os próprios"
  on public.clientes for delete to authenticated
  using ((select auth.uid()) = prestador_id);

-- Orçamentos: só os do próprio prestador
drop policy if exists "Orçamentos: ver os próprios" on public.orcamentos;
create policy "Orçamentos: ver os próprios"
  on public.orcamentos for select to authenticated
  using ((select auth.uid()) = prestador_id);

drop policy if exists "Orçamentos: criar os próprios" on public.orcamentos;
create policy "Orçamentos: criar os próprios"
  on public.orcamentos for insert to authenticated
  with check ((select auth.uid()) = prestador_id);

drop policy if exists "Orçamentos: editar os próprios" on public.orcamentos;
create policy "Orçamentos: editar os próprios"
  on public.orcamentos for update to authenticated
  using ((select auth.uid()) = prestador_id)
  with check ((select auth.uid()) = prestador_id);

drop policy if exists "Orçamentos: apagar os próprios" on public.orcamentos;
create policy "Orçamentos: apagar os próprios"
  on public.orcamentos for delete to authenticated
  using ((select auth.uid()) = prestador_id);

-- Itens: liberados apenas se o orçamento pai for do prestador logado
drop policy if exists "Itens: ver dos próprios orçamentos" on public.itens_orcamento;
create policy "Itens: ver dos próprios orçamentos"
  on public.itens_orcamento for select to authenticated
  using (exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_id and o.prestador_id = (select auth.uid())
  ));

drop policy if exists "Itens: criar nos próprios orçamentos" on public.itens_orcamento;
create policy "Itens: criar nos próprios orçamentos"
  on public.itens_orcamento for insert to authenticated
  with check (exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_id and o.prestador_id = (select auth.uid())
  ));

drop policy if exists "Itens: editar dos próprios orçamentos" on public.itens_orcamento;
create policy "Itens: editar dos próprios orçamentos"
  on public.itens_orcamento for update to authenticated
  using (exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_id and o.prestador_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_id and o.prestador_id = (select auth.uid())
  ));

drop policy if exists "Itens: apagar dos próprios orçamentos" on public.itens_orcamento;
create policy "Itens: apagar dos próprios orçamentos"
  on public.itens_orcamento for delete to authenticated
  using (exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_id and o.prestador_id = (select auth.uid())
  ));

-- -----------------------------------------------------------------------------
-- 7. Salvar orçamento + itens numa única transação
--    O app valida e recalcula tudo antes (zod); esta função só grava, de forma
--    atômica: ou salva o orçamento e todos os itens, ou nada.
--    security invoker: as policies de RLS acima continuam valendo.
-- -----------------------------------------------------------------------------
create or replace function public.salvar_orcamento(
  p_orcamento_id uuid,
  p_dados jsonb,
  p_itens jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'orcamento_sem_itens';
  end if;

  if p_orcamento_id is null then
    insert into public.orcamentos (
      cliente_id, titulo, desconto_centavos, percentual_sinal,
      valido_ate, condicoes_pagamento, observacoes
    )
    values (
      (p_dados ->> 'cliente_id')::uuid,
      p_dados ->> 'titulo',
      coalesce((p_dados ->> 'desconto_centavos')::integer, 0),
      coalesce((p_dados ->> 'percentual_sinal')::integer, 0),
      (p_dados ->> 'valido_ate')::date,
      p_dados ->> 'condicoes_pagamento',
      p_dados ->> 'observacoes'
    )
    returning id into v_id;
  else
    update public.orcamentos
       set cliente_id          = (p_dados ->> 'cliente_id')::uuid,
           titulo              = p_dados ->> 'titulo',
           desconto_centavos   = coalesce((p_dados ->> 'desconto_centavos')::integer, 0),
           percentual_sinal    = coalesce((p_dados ->> 'percentual_sinal')::integer, 0),
           valido_ate          = (p_dados ->> 'valido_ate')::date,
           condicoes_pagamento = p_dados ->> 'condicoes_pagamento',
           observacoes         = p_dados ->> 'observacoes'
     where id = p_orcamento_id
    returning id into v_id;

    if v_id is null then
      raise exception 'orcamento_nao_encontrado';
    end if;

    delete from public.itens_orcamento where orcamento_id = v_id;
  end if;

  insert into public.itens_orcamento (
    orcamento_id, descricao, quantidade, unidade, valor_unitario_centavos, ordem
  )
  select v_id,
         item ->> 'descricao',
         (item ->> 'quantidade')::numeric,
         item ->> 'unidade',
         (item ->> 'valor_unitario_centavos')::integer,
         (posicao - 1)::integer
    from jsonb_array_elements(p_itens) with ordinality as t(item, posicao);

  return v_id;
end;
$$;

revoke execute on function public.salvar_orcamento(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_orcamento(uuid, jsonb, jsonb) to authenticated;
