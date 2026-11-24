-- =============================================================================
-- Orçaí — Migration 005: uso da IA ("Montar com IA")
-- Pré-requisito: 001 a 004 já executadas.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
--
-- Cada geração de itens com IA vira uma linha em uso_ia. Ela serve para o
-- limite por hora e para acompanhar o consumo de tokens.
--
-- O prestador só LÊ o próprio uso. Ele não pode inserir, alterar ou apagar
-- linhas direto pela API (senão apagaria o histórico para fugir do limite):
-- a escrita passa só pelas funções reservar_uso_ia e concluir_uso_ia.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela
-- -----------------------------------------------------------------------------
create table if not exists public.uso_ia (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.prestadores (id) on delete cascade,
  criado_em timestamptz not null default now(),
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  sucesso boolean not null default false,
  -- true depois que concluir_uso_ia gravou o resultado (não muda mais)
  concluido boolean not null default false
);

create index if not exists uso_ia_prestador_criado_em_idx
  on public.uso_ia (prestador_id, criado_em desc);

-- -----------------------------------------------------------------------------
-- 2. RLS: cada prestador só vê o próprio uso (sem policies de escrita)
-- -----------------------------------------------------------------------------
alter table public.uso_ia enable row level security;

revoke all on public.uso_ia from anon;
revoke insert, update, delete on public.uso_ia from authenticated;
grant select on public.uso_ia to authenticated;

drop policy if exists "Prestador lê o próprio uso de IA" on public.uso_ia;
create policy "Prestador lê o próprio uso de IA"
  on public.uso_ia for select
  to authenticated
  using ((select auth.uid()) = prestador_id);

-- -----------------------------------------------------------------------------
-- 3. reservar_uso_ia: confere o limite da janela e, se couber, registra o uso
--    ANTES de chamar a IA. A trava na linha do prestador serializa pedidos
--    simultâneos: dois cliques ao mesmo tempo não passam juntos do limite.
--
--    Devolve: permitido, usos na janela, quando a próxima vaga abre (se
--    bloqueado) e o id do uso reservado (se permitido).
-- -----------------------------------------------------------------------------
create or replace function public.reservar_uso_ia(
  p_limite integer,
  p_janela interval default interval '1 hour'
)
returns table (
  permitido boolean,
  usos integer,
  liberado_em timestamptz,
  uso_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prestador uuid := auth.uid();
  v_usos integer;
  v_mais_antigo timestamptz;
  v_id uuid;
begin
  if v_prestador is null then
    raise exception 'nao_autenticado';
  end if;
  if p_limite is null or p_limite < 1 or p_janela is null or p_janela <= interval '0' then
    raise exception 'limite_invalido';
  end if;

  -- Serializa as reservas do mesmo prestador.
  perform 1 from public.prestadores where id = v_prestador for update;
  if not found then
    raise exception 'prestador_nao_encontrado';
  end if;

  select count(*), min(u.criado_em)
    into v_usos, v_mais_antigo
    from public.uso_ia u
   where u.prestador_id = v_prestador
     and u.criado_em > now() - p_janela;

  if v_usos >= p_limite then
    -- A vaga abre quando o uso mais antigo dentro da janela sair dela.
    return query select false, v_usos, v_mais_antigo + p_janela, null::uuid;
    return;
  end if;

  insert into public.uso_ia (prestador_id) values (v_prestador) returning id into v_id;
  return query select true, v_usos + 1, null::timestamptz, v_id;
end;
$$;

revoke execute on function public.reservar_uso_ia(integer, interval) from public, anon;
grant execute on function public.reservar_uso_ia(integer, interval) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. concluir_uso_ia: grava tokens e resultado de um uso reservado.
--    Só o dono, só uma vez (depois de concluído, o uso não muda mais).
-- -----------------------------------------------------------------------------
create or replace function public.concluir_uso_ia(
  p_uso_id uuid,
  p_tokens_entrada integer,
  p_tokens_saida integer,
  p_sucesso boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.uso_ia
     set tokens_entrada = greatest(coalesce(p_tokens_entrada, 0), 0),
         tokens_saida = greatest(coalesce(p_tokens_saida, 0), 0),
         sucesso = coalesce(p_sucesso, false),
         concluido = true
   where id = p_uso_id
     and prestador_id = auth.uid()
     and not concluido;
end;
$$;

revoke execute on function public.concluir_uso_ia(uuid, integer, integer, boolean) from public, anon;
grant execute on function public.concluir_uso_ia(uuid, integer, integer, boolean) to authenticated;
