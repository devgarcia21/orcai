# Orçaí

Orçamentos profissionais pelo WhatsApp, com sinal por PIX.

O Orçaí é um SaaS para prestadores de serviço brasileiros (eletricistas, encanadores,
pedreiros, oficinas) criarem orçamentos bonitos e claros direto do celular, enviarem ao
cliente pelo WhatsApp e receberem o sinal por PIX.

> 🚧 Em construção. Etapa atual: **7 — painel com métricas**.

## O que já funciona

- Cadastro, login e perfil do prestador (com logo e chave PIX)
- Cadastro de clientes com busca por nome ou telefone
- Orçamentos com itens, desconto, sinal e validade, com resumo calculado em tempo real
- Numeração automática por prestador (#0001, #0002...)
- Status (rascunho, enviado, aprovado, recusado), duplicar e excluir
- PDF profissional do orçamento (A4, com logo, tabela de itens, totais e chave PIX), para ver ou baixar
- Navegação instantânea no painel: a tela aparece na hora e os dados chegam em seguida
- Envio pelo WhatsApp com mensagem pronta e link público do orçamento
- Página do cliente (sem login): ver itens e totais, copiar a chave PIX, baixar o PDF e aprovar ou recusar
- Linha do tempo no painel: criado, enviado, visualizado pelo cliente, resposta e sinal recebido
- Pagamento do sinal por PIX: depois de aprovar, o cliente vê o QR Code e o "Pix Copia e Cola"
  com o valor do sinal (ou do total, se o sinal for 0%); o QR também sai no PDF
- **Montar com IA**: descreva (ou dite) o serviço — "trocar 3 tomadas e instalar um chuveiro" —
  e a IA sugere os itens com unidade e quantidade; você revisa e adiciona ao orçamento
- **Painel com métricas** no Início: valor aprovado, sinais a receber e recebidos, taxa de
  aprovação e orçamentos aguardando resposta (com comparação com o período anterior), gráfico
  dos últimos 6 meses, funil e uma lista do que precisa de atenção — com lembrete pelo WhatsApp
- Orçamentos enviados com a validade vencida aparecem como "Vencido"

## Sobre o pagamento por PIX

O QR Code é **estático**: ele é gerado a partir da chave PIX do prestador, segundo o
Manual de Padrões para Iniciação do Pix do Banco Central, sem intermediários e sem taxas.
Por isso, **a confirmação do pagamento é manual** — o prestador confere o extrato do banco
e clica em "Marcar sinal como recebido" (dá para desfazer se marcar por engano).

**Evolução futura:** integrar um gateway de pagamento (ex.: Mercado Pago ou Efí) para gerar
cobranças PIX dinâmicas e confirmar o pagamento automaticamente via webhook.

## Sobre a IA

O bloco **Montar com IA** usa a API do Google Gemini (plano gratuito), só no servidor.

- **A IA nunca inventa preço.** O valor vem, nesta ordem: do preço que **você escreveu** no
  texto ("chuveiro por 150 reais", "3 tomadas a 20 reais cada"), do seu **histórico** (até 50
  itens de orçamentos anteriores) ou fica vazio, destacado com "Defina o valor". Um preço só é
  aceito se o número realmente estiver no seu texto ou no histórico.
- A resposta vem em JSON com schema e é validada antes de aparecer; nada é salvo sozinho.
- Limites: 30 gerações por hora por prestador e textos de até 1.500 caracteres.
- O ditado usa o reconhecimento de voz do navegador (Chrome, Edge, Safari) e só aparece em
  `https://` ou `localhost`.
- Sem a chave configurada, o bloco aparece desativado e o resto do app funciona normalmente.

**Como obter a chave grátis:** entre no [Google AI Studio](https://aistudio.google.com/apikey)
com uma conta Google, clique em **Create API key** e copie a chave para `GEMINI_API_KEY` no
`.env.local`. Opcionalmente, troque o modelo em `GEMINI_MODEL` (padrão:
`gemini-3.5-flash-lite`). A IA fica isolada atrás de uma interface (`src/lib/ia/provedor.ts`):
trocar de provedor é criar outra implementação.

## Tecnologias

Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth,
Postgres, Storage) · Google Gemini · zod · Server Actions · React PDF · Vitest

## Como rodar

**Pré-requisitos:** Node.js 22 ou superior e uma conta gratuita no
[Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a chave
   publicável do seu projeto Supabase (_Project Settings → API Keys_) e com o endereço
   do app em `NEXT_PUBLIC_APP_URL` (ex.: `http://localhost:3000`), usado nos links
   enviados aos clientes. Para a IA, preencha `GEMINI_API_KEY` (veja "Sobre a IA").

3. No Supabase, abra o **SQL Editor** e execute, **em ordem**, cada arquivo de
   `supabase/migrations/`:
   1. `001_inicial.sql`
   2. `002_clientes_orcamentos.sql`
   3. `003_link_publico.sql`
   4. `004_pix_sinal.sql`
   5. `005_uso_ia.sql`

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
- **Gerador de PIX próprio e testado**: o "Pix Copia e Cola" (formato EMV + CRC16) reproduz
  byte a byte o exemplo oficial do Banco Central, e um teste decodifica o QR Code desenhado
  com um leitor independente (jsQR) para garantir que ele é legível.
- **Métricas num módulo puro e testado** (`src/lib/metricas`): recebe os orçamentos e devolve
  todos os indicadores, sempre com o mesmo módulo de cálculos e datas no fuso de São Paulo
  (inclusive a virada do mês). O filtro de período fica na URL.
- **IA sem preço inventado e à prova de "ignore as regras"**: o texto do prestador vai como
  dado dentro de um JSON, a resposta é validada item a item com zod e o valor só pode vir do
  histórico de preços do próprio prestador. O limite por hora é conferido no banco antes da chamada.
- **Link público seguro**: o cliente acessa por um token aleatório de 192 bits, sem login,
  e as tabelas continuam fechadas — a leitura e a resposta passam por funções do banco que
  devolvem só o necessário (testadas com Postgres real no PGlite).

## Roadmap

1. ✅ Base: login, cadastro e perfil do prestador
2. ✅ Clientes e orçamentos com itens
3. ✅ PDF profissional
4. ✅ Link público com aprovar/recusar e envio por WhatsApp
5. ✅ QR Code PIX estático do sinal
6. ✅ IA que transforma texto ou voz em itens de orçamento
7. ✅ Painel com métricas
8. Testes e deploy
