# Orçaí

Orçamentos profissionais pelo WhatsApp, com sinal por PIX.

O Orçaí é um SaaS para prestadores de serviço brasileiros (eletricistas, encanadores,
pedreiros, oficinas) criarem orçamentos bonitos e claros direto do celular, enviarem ao
cliente pelo WhatsApp e receberem o sinal por PIX.

> 🚧 Em construção. Etapa atual: **1 — base do projeto, login e perfil do prestador**.

## Tecnologias

Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth,
Postgres, Storage) · zod · Server Actions

## Como rodar

**Pré-requisitos:** Node.js 22 ou superior e uma conta gratuita no
[Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a chave
   publicável do seu projeto Supabase (_Project Settings → API Keys_).

3. No Supabase, abra o **SQL Editor**, cole o conteúdo de
   `supabase/migrations/001_inicial.sql` e clique em **Run**.

4. Rode o projeto:

   ```bash
   npm run dev
   ```

   Acesse <http://localhost:3000>.

## Scripts

| Comando             | O que faz                         |
| ------------------- | --------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento       |
| `npm run build`     | Build de produção                 |
| `npm run start`     | Servidor de produção (após build) |
| `npm run lint`      | Verifica o código com ESLint      |
| `npm run typecheck` | Verifica os tipos do TypeScript   |
| `npm run format`    | Formata o código com Prettier     |

## Roadmap

1. ✅ Base: login, cadastro e perfil do prestador
2. Clientes e orçamentos com itens
3. PDF profissional
4. Link público com aprovar/recusar e envio por WhatsApp
5. QR Code PIX estático do sinal
6. IA que transforma texto ou áudio em itens de orçamento
7. Painel com métricas
8. Testes e deploy
