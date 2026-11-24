-- =============================================================================
-- Orçaí — Migration 003: link público do orçamento (ver, aprovar, recusar)
-- Pré-requisito: 001 e 002 já executadas.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
--
-- Segurança: as tabelas continuam FECHADAS para o papel anon (RLS sem policy
-- para anon). O cliente só enxerga o orçamento por meio de duas funções
-- SECURITY DEFINER que recebem o token secreto e devolvem só o necessário.
-- =============================================================================

-- Aleatoriedade criptográfica (no Supabase o pgcrypto já vive no schema extensions)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Novas colunas
-- -----------------------------------------------------------------------------
alter table public.orcamentos
  add column if not exists token_publico  text,
  add column if not exists enviado_em     timestamptz,
  add column if not exists visualizado_em timestamptz,
  add column if not exists respondido_em  timestamptz,
  add column if not exists motivo_recusa  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orcamentos_token_publico_key') then
    alter table public.orcamentos
      add constraint orcamentos_token_publico_key unique (token_publico);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orcamentos_motivo_recusa_tamanho') then
    alter table public.orcamentos
      add constraint orcamentos_motivo_recusa_tamanho check (char_length(motivo_recusa) <= 500);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Token: 24 bytes aleatórios (192 bits) em base64url → 32 caracteres
-- -----------------------------------------------------------------------------
create or replace function public.gerar_token_publico()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
$$;

revoke execute on function public.gerar_token_publico() from public, anon;

-- Data de hoje no fuso do Brasil (a validade é uma data, sem hora)
create or replace function public.hoje_brasil()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- -----------------------------------------------------------------------------
-- 3. Proteção de orçamentos finalizados: agora permite registrar a visualização
--    (o cliente pode abrir o link depois que o prestador marcou como aprovado).
--    Substitui a função criada na migration 002.
-- -----------------------------------------------------------------------------
create or replace function public.proteger_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('aprovado', 'recusado') then
    -- Única alteração permitida: preencher visualizado_em.
    if (to_jsonb(new) - 'visualizado_em' - 'updated_at')
       = (to_jsonb(old) - 'visualizado_em' - 'updated_at') then
      return new;
    end if;
    raise exception 'orcamento_finalizado'
      using hint = 'Orçamentos aprovados ou recusados não podem ser alterados.';
  end if;
  new.numero = old.numero;
  new.prestador_id = old.prestador_id;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Prestador: preparar o envio (painel, usuário logado)
--    Gera o token se ainda não existir, rascunho → enviado e grava enviado_em.
--    security invoker: o RLS garante que só o dono consegue.
-- -----------------------------------------------------------------------------
create or replace function public.preparar_envio_orcamento(p_orcamento_id uuid)
returns table (token_publico text, status text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.orcamentos o
     set token_publico = coalesce(o.token_publico, public.gerar_token_publico()),
         status        = case when o.status = 'rascunho' then 'enviado' else o.status end,
         enviado_em    = coalesce(o.enviado_em, now())
   where o.id = p_orcamento_id
     and o.status in ('rascunho', 'enviado')
  returning o.token_publico, o.status;

  if not found then
    raise exception 'orcamento_nao_enviavel'
      using hint = 'Só rascunhos e orçamentos enviados podem ser enviados ao cliente.';
  end if;
end;
$$;

revoke execute on function public.preparar_envio_orcamento(uuid) from public, anon;
grant execute on function public.preparar_envio_orcamento(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Cliente: ver o orçamento pelo token (público)
--    Devolve só o que o cliente precisa ver. Nunca devolve ids internos nem
--    dados de outros orçamentos. Rascunhos e tokens inválidos → null.
--
--    p_registrar_visualizacao: grava visualizado_em na primeira abertura.
--    O app passa false ao montar a página no servidor (o robô de prévia do
--    WhatsApp também "abre" o link) e true só a partir do navegador do cliente.
--    Visualizações do próprio prestador logado nunca contam.
-- -----------------------------------------------------------------------------
create or replace function public.obter_orcamento_publico(
  p_token text,
  p_registrar_visualizacao boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orcamento public.orcamentos;
  v_resultado jsonb;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;

  select * into v_orcamento
    from public.orcamentos
   where token_publico = p_token
     and status <> 'rascunho';

  if not found then
    return null;
  end if;

  if p_registrar_visualizacao
     and v_orcamento.visualizado_em is null
     and v_orcamento.prestador_id is distinct from auth.uid() then
    update public.orcamentos
       set visualizado_em = now()
     where id = v_orcamento.id
       and visualizado_em is null;
  end if;

  select jsonb_build_object(
           'numero',              o.numero,
           'titulo',              o.titulo,
           'status',              o.status,
           'created_at',          o.created_at,
           'enviado_em',          o.enviado_em,
           'respondido_em',       o.respondido_em,
           'valido_ate',          o.valido_ate,
           'vencido',             (o.valido_ate is not null and o.valido_ate < public.hoje_brasil()),
           'desconto_centavos',   o.desconto_centavos,
           'percentual_sinal',    o.percentual_sinal,
           'condicoes_pagamento', o.condicoes_pagamento,
           'observacoes',         o.observacoes,
           'prestador', jsonb_build_object(
             'nome',           p.nome,
             'nome_empresa',   p.nome_empresa,
             'telefone',       p.telefone,
             'cidade',         p.cidade,
             'logo_url',       p.logo_url,
             'tipo_chave_pix', p.tipo_chave_pix,
             'chave_pix',      p.chave_pix
           ),
           'cliente', jsonb_build_object(
             'nome',     c.nome,
             'telefone', c.telefone,
             'email',    c.email,
             'endereco', c.endereco
           ),
           'itens', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'descricao',               i.descricao,
                      'quantidade',              i.quantidade,
                      'unidade',                 i.unidade,
                      'valor_unitario_centavos', i.valor_unitario_centavos
                    ) order by i.ordem)
               from public.itens_orcamento i
              where i.orcamento_id = o.id
           ), '[]'::jsonb)
         )
    into v_resultado
    from public.orcamentos o
    join public.prestadores p on p.id = o.prestador_id
    join public.clientes c on c.id = o.cliente_id
   where o.id = v_orcamento.id;

  return v_resultado;
end;
$$;

revoke execute on function public.obter_orcamento_publico(text, boolean) from public;
grant execute on function public.obter_orcamento_publico(text, boolean) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Cliente: aprovar ou recusar pelo token (público)
--    Só quando status = 'enviado' e dentro da validade. Devolve o novo status.
-- -----------------------------------------------------------------------------
create or replace function public.responder_orcamento(
  p_token text,
  p_acao text,
  p_motivo text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orcamento public.orcamentos;
  v_novo_status text;
  v_motivo text := nullif(trim(p_motivo), '');
begin
  if p_acao not in ('aprovar', 'recusar') then
    raise exception 'acao_invalida';
  end if;
  if char_length(v_motivo) > 500 then
    raise exception 'motivo_muito_longo';
  end if;

  -- for update: duas respostas simultâneas não passam juntas
  select * into v_orcamento
    from public.orcamentos
   where token_publico = p_token
     and status <> 'rascunho'
     for update;

  if not found then
    raise exception 'orcamento_nao_encontrado';
  end if;
  if v_orcamento.status in ('aprovado', 'recusado') then
    raise exception 'orcamento_ja_respondido';
  end if;
  if v_orcamento.valido_ate is not null and v_orcamento.valido_ate < public.hoje_brasil() then
    raise exception 'orcamento_vencido';
  end if;

  v_novo_status := case p_acao when 'aprovar' then 'aprovado' else 'recusado' end;

  update public.orcamentos
     set status        = v_novo_status,
         respondido_em = now(),
         motivo_recusa = case when p_acao = 'recusar' then v_motivo end
   where id = v_orcamento.id;

  return v_novo_status;
end;
$$;

revoke execute on function public.responder_orcamento(text, text, text) from public;
grant execute on function public.responder_orcamento(text, text, text) to anon, authenticated;
