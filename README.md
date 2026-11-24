# Orçaí

Orçamentos profissionais pelo WhatsApp, com sinal por PIX.

O Orçaí é um SaaS para prestadores de serviço brasileiros (eletricistas, encanadores,
pedreiros, oficinas) criarem orçamentos bonitos e claros direto do celular, enviarem ao
cliente pelo WhatsApp e receberem o sinal por PIX.

> 🚧 Em construção. Etapa atual: **3 — PDF profissional do orçamento**.

## O que já funciona

- Cadastro, login e perfil do prestador (com logo e chave PIX)
- Cadastro de clientes com busca por nome ou telefone
- Orçamentos com itens, desconto, sinal e validade, com resumo calculado em tempo real
- Numeração automática por prestador (#0001, #0002...)
- Status (rascunho, enviado, aprovado, recusado), duplicar e excluir
- PDF profissional do orçamento (A4, com logo, tabela de itens, totais e chave PIX), para ver ou baixar
- Navegação instantânea no painel: a tela aparece na hora e os dados chegam em seguida

## Tecnologias

Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth,
Postgres, Storage) · zod · Server Actions · React PDF · Vitest

## Como rodar

**Pré-requisitos:** Node.js 22 ou superior e uma conta gratuita no
[Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a chave
   publicável do seu projeto Supabase (_Project Settings → API Keys_).

3. No Supabase, abra o **SQL Editor** e execute, **em ordem**, cada arquivo de
   `supabase/migrations/`:
   1. `001_inicial.sql`
   2. `002_clientes_orcamentos.sql`

   (Os scripts podem ser executados mais de uma vez sem erro.)

4. Rode o projeto:

   ```bash
   npm run dev
   ```

   Acesse <http://localhost:3000>.

## Scripts

| Comando              | O que faz                         |
| -------------------- | --------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento       |
| `npm run build`      | Build de produção                 |
| `npm run start`      | Servidor de produção (após build) |
| `npm test`           | Roda os testes (Vitest)           |
| `npm run test:watch` | Testes em modo contínuo           |
| `npm run lint`       | Verifica o código com ESLint      |
| `npm run typecheck`  | Verifica os tipos do TypeScript   |
| `npm run format`     | Formata o código com Prettier     |

## Destaques técnicos

- **Dinheiro em centavos inteiros**, nunca em float, do banco à tela.
- **Um único módulo de cálculo** (`src/lib/orcamento/calculos.ts`), coberto por testes,
  usado tanto no resumo em tempo real quanto na validação do servidor.
- **Segurança no banco**: RLS em todas as tabelas, chave estrangeira composta garantindo
  que o cliente pertence ao mesmo prestador, e orçamentos aprovados/recusados congelados
  por trigger.
- **PDF gerado no servidor** com React PDF, testado de verdade: o teste renderiza um
  orçamento de 60 itens, extrai o texto de cada página e confere quebra de página,
  rodapé e que nenhuma linha foi cortada.
- **Navegação instantânea** com Cache Components: cada página tem uma casca estática e
  os dados do usuário chegam em streaming, com esqueletos no lugar exato do conteúdo.

## Roadmap

1. ✅ Base: login, cadastro e perfil do prestador
2. ✅ Clientes e orçamentos com itens
3. ✅ PDF profissional
4. Link público com aprovar/recusar e envio por WhatsApp
5. QR Code PIX estático do sinal
6. IA que transforma texto ou áudio em itens de orçamento
7. Painel com métricas
8. Testes e deploy
