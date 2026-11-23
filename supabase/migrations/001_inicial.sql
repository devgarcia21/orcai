-- =============================================================================
-- Orçaí — Migration 001: prestadores + storage de logos
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela de prestadores (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.prestadores (
  id             uuid primary key references auth.users (id) on delete cascade,
  nome           text not null default '',
  nome_empresa   text,
  telefone       text,
  cidade         text,
  tipo_chave_pix text check (tipo_chave_pix in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  chave_pix      text,
  logo_url       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Tipo e chave PIX andam juntos: ou os dois preenchidos, ou nenhum.
  constraint prestadores_pix_completo check (
    (tipo_chave_pix is null and chave_pix is null)
    or (tipo_chave_pix is not null and chave_pix is not null)
  )
);

comment on table public.prestadores is 'Perfil do prestador de serviço (um por usuário do Auth).';

-- -----------------------------------------------------------------------------
-- 2. Trigger: mantém updated_at sempre atualizado
-- -----------------------------------------------------------------------------
create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prestadores_updated_at on public.prestadores;
create trigger prestadores_updated_at
  before update on public.prestadores
  for each row execute function public.atualizar_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Trigger: cria o prestador automaticamente quando alguém se cadastra
--    O nome vem de options.data.nome, enviado no signUp.
-- -----------------------------------------------------------------------------
create or replace function public.criar_prestador_ao_cadastrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.prestadores (id, nome)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_criar_prestador on auth.users;
create trigger ao_criar_usuario_criar_prestador
  after insert on auth.users
  for each row execute function public.criar_prestador_ao_cadastrar();

-- -----------------------------------------------------------------------------
-- 4. RLS: cada prestador só lê e edita a própria linha
--    (não há policy de insert/delete: a linha é criada pelo trigger e apagada
--    em cascata junto com o usuário)
-- -----------------------------------------------------------------------------
alter table public.prestadores enable row level security;

drop policy if exists "Prestador lê o próprio perfil" on public.prestadores;
create policy "Prestador lê o próprio perfil"
  on public.prestadores for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Prestador edita o próprio perfil" on public.prestadores;
create policy "Prestador edita o próprio perfil"
  on public.prestadores for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- 5. Storage: bucket público "logos" (leitura pública, escrita só na própria pasta)
--    Caminho dos arquivos: logos/<id_do_usuario>/<arquivo>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Logos: leitura pública" on storage.objects;
create policy "Logos: leitura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "Logos: enviar na própria pasta" on storage.objects;
create policy "Logos: enviar na própria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Logos: trocar na própria pasta" on storage.objects;
create policy "Logos: trocar na própria pasta"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Logos: apagar na própria pasta" on storage.objects;
create policy "Logos: apagar na própria pasta"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
