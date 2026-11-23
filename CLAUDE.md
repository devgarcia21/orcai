@AGENTS.md

# Orçaí

## Visão do produto

SaaS para prestadores de serviço brasileiros (eletricistas, encanadores, pedreiros,
oficinas) criarem **orçamentos profissionais**, enviarem pelo **WhatsApp** e receberem o
**sinal por PIX**. O prestador usa principalmente o **celular**: toda tela é pensada
mobile-first, com alvos de toque grandes (inputs e botões de 44px) e texto simples.

Projeto de portfólio: o código deve ser limpo, organizado e fácil de ler.

## Stack

- **Next.js 16** (App Router, Turbopack, `cacheComponents` + `partialPrefetching`) + TypeScript strict
- **Tailwind CSS 4** + **shadcn/ui** (estilo `base-nova`, primitivas do Base UI, `cn` do pacote `cn`)
- **Supabase** (Auth, Postgres, Storage) via `@supabase/ssr`
- **zod 4** para validação (mesmas regras no cliente e no servidor)
- **Server Actions** para todos os formulários
- ESLint (config do Next + `eslint-config-prettier`) e Prettier (com plugin do Tailwind)

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (http://localhost:3000)
npm run build        # build de produção (deve passar sem erros)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier em tudo
```

## Estrutura

```
src/
  proxy.ts                  # (antigo middleware) renova sessão e protege /painel/*
  actions/                  # Server Actions ("use server"): auth.ts, perfil.ts
  app/
    page.tsx                # landing
    (auth)/login, cadastro  # telas públicas de autenticação
    auth/callback/route.ts  # destino do link de confirmação de e-mail
    painel/                 # área logada (layout com cabeçalho) + perfil
  components/
    ui/                     # componentes shadcn (não editar à toa)
    formulario/             # Campo, CampoBase, BotaoEnviar, MensagemFormulario
    auth/ painel/ perfil/   # componentes por domínio
  hooks/use-acao-formulario.ts  # liga <form> a uma Server Action
  lib/
    supabase/               # clientes browser/server/proxy, env, tradução de erros
    dados/                  # leitura de dados no servidor (com React cache)
    validacoes/             # schemas zod
    types/database.ts       # tipos do banco (manuais por enquanto)
    acoes.ts                # tipo EstadoAcao e helpers erro()/sucesso()
    formatacao.ts pix.ts rotas.ts
supabase/migrations/        # SQL colado manualmente no SQL Editor do Supabase
```

## Decisões tomadas

- **Proxy, não middleware**: no Next 16 o arquivo se chama `src/proxy.ts` (mesma função).
  Ele renova a sessão com `getClaims()` e faz os redirecionamentos de acesso. As páginas
  do painel também checam o usuário (`exigirUsuario`) — o proxy não é a única barreira.
- **Segurança no banco**: RLS em todas as tabelas; o app usa só a chave publicável.
  Nenhuma chave secreta (service role) no projeto.
- **Perfil criado por trigger** (`criar_prestador_ao_cadastrar`) com o `nome` enviado em
  `options.data` no `signUp`. Por isso não existe policy de insert em `prestadores`.
- **Formulários**: Server Action + `useActionState` via `useAcaoFormulario`, que usa
  `onSubmit` + `startTransition` para o React **não limpar os campos** quando há erro.
  Toda action devolve `EstadoAcao` (`status`, `mensagem`, `errosCampos`).
- **Validação dupla**: os schemas zod em `lib/validacoes` rodam no servidor; regras
  usadas no cliente (ex.: `validarLogo`) moram no mesmo arquivo para não duplicar.
- **Dados normalizados**: telefone salvo só com dígitos (`11987654321`); chave PIX salva
  no formato oficial (CPF/CNPJ só dígitos, telefone `+55...`, e-mail/EVP minúsculos).
  Máscaras só na interface (`lib/formatacao.ts`).
- **Logo**: enviada no mesmo formulário do perfil (limite de body das Server Actions
  ajustado para 3 MB). Caminho `logos/<user_id>/logo-<timestamp>.<ext>` — nome único evita
  cache velho; as antigas são apagadas **depois** que o banco aponta para a nova.
- **Cache Components ligado**: dados por requisição (cookies, searchParams, Supabase)
  ficam dentro de `<Suspense>` com skeletons. Não use `new Date()` em componentes
  pré-renderizados.
- **Cadastro com ou sem confirmação de e-mail**: se o Supabase devolver sessão, vai direto
  ao painel; senão mostra "confira seu e-mail". `/auth/callback` aceita `code` e `token_hash`.
- **Redirecionamento seguro**: `?next=` passa por `destinoSeguro()` (evita open redirect).
- **Idioma**: interface, mensagens, nomes de domínio (tabelas, colunas, funções) em
  português. Termos técnicos do framework continuam em inglês.

## Convenções

- Mensagens de erro em português, claras e acionáveis ("Digite um telefone válido com DDD").
- Novos formulários: reutilize `Campo`/`CampoBase`, `BotaoEnviar`, `MensagemFormulario` e
  `useAcaoFormulario`. Nada de lógica de validação duplicada.
- Novas tabelas: sempre em nova migration numerada (`002_...sql`), idempotente, com RLS.
- Rotas: use as constantes de `lib/rotas.ts`.

## Roadmap

- [x] **Etapa 1** — Base: projeto, login, cadastro e perfil do prestador
- [ ] **Etapa 2** — Clientes e orçamentos com itens
- [ ] **Etapa 3** — PDF profissional do orçamento
- [ ] **Etapa 4** — Link público com aprovar/recusar e envio por WhatsApp
- [ ] **Etapa 5** — QR Code PIX estático do sinal
- [ ] **Etapa 6** — IA que transforma texto ou áudio em itens de orçamento
- [ ] **Etapa 7** — Painel com métricas
- [ ] **Etapa 8** — README final, testes e deploy
