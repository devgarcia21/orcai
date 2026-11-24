-- =============================================================================
-- Orçaí — Migration 004: sinal pago via PIX (QR Code estático)
-- Pré-requisito: 001, 002 e 003 já executadas.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
--
-- O QR Code é estático (sem gateway): o prestador confirma o recebimento à mão.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Quando o prestador marcou o sinal como recebido (null = ainda não recebido)
-- -----------------------------------------------------------------------------
alter table public.orcamentos
  add column if not exists sinal_recebido_em timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orcamentos_sinal_so_aprovado') then
    alter table public.orcamentos
      add constraint orcamentos_sinal_so_aprovado
      check (sinal_recebido_em is null or status = 'aprovado');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Orçamentos finalizados continuam congelados, exceto:
--    - visualizado_em (cliente abrindo o link)  — desde a 003
--    - sinal_recebido_em (prestador marca/desfaz o sinal) — novo
-- -----------------------------------------------------------------------------
create or replace function public.proteger_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('aprovado', 'recusado') then
    if (to_jsonb(new) - 'visualizado_em' - 'sinal_recebido_em' - 'updated_at')
       = (to_jsonb(old) - 'visualizado_em' - 'sinal_recebido_em' - 'updated_at') then
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
-- 3. obter_orcamento_publico: agora informa se o sinal já foi recebido e uma
--    referência curta (8 caracteres aleatórios do id) para o txid do PIX.
--    Continua sem devolver ids completos. Mesma assinatura da 003.
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
           'sinal_recebido',      (o.sinal_recebido_em is not null),
           'referencia_pix',      substr(replace(o.id::text, '-', ''), 1, 8),
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
