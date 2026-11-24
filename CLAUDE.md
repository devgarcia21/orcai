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
- **Vitest** para testes das regras de negócio
- ESLint (config do Next + `eslint-config-prettier`) e Prettier (com plugin do Tailwind)

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (http://localhost:3000)
npm run build        # build de produção (deve passar sem erros)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (uma vez); npm run test:watch para modo contínuo
npm run format       # Prettier em tudo
```

Antes de commitar: `lint`, `typecheck`, `test` e `build` precisam passar.

## Estrutura

```
src/
  proxy.ts                  # (antigo middleware) renova sessão e protege /painel/*
  actions/                  # Server Actions: auth, perfil, clientes, orcamentos,
                            # envio (prestador) e publico (cliente, sem login)
  app/
    page.tsx                # landing
    (auth)/login, cadastro  # telas públicas de autenticação
    auth/callback/route.ts  # destino do link de confirmação de e-mail
    painel/                 # área logada: layout (cabeçalho + navegação), error, not-found
      clientes/ [id]/       # lista com busca; detalhes + orçamentos do cliente
      orcamentos/ novo/ [id]/ [id]/editar/
      orcamentos/[id]/pdf/route.ts  # PDF do orçamento (Route Handler)
      perfil/
    o/[token]/              # página PÚBLICA do cliente (sem login) + pdf/route.ts + not-found
  components/
    ui/                     # componentes shadcn (não editar à toa)
    comum/                  # EstadoVazio, CabecalhoPagina, CampoBusca, ConfirmarAcao
    formulario/             # Campo, CampoBase, BotaoEnviar, MensagemFormulario,
                            # InputMoeda, SelectNativo, Secao
    painel/esqueletos.tsx   # esqueletos de carregamento, no formato de cada conteúdo
    clientes/ orcamentos/ painel/ perfil/ auth/   # componentes por domínio
    pix/                    # QrCode (SVG) e BlocoPagamentoPix (cliente e painel)
    publico/                # página do cliente: resposta, visualização, PIX, status
    orcamentos/conteudo-orcamento.tsx  # itens e condições (painel E página pública)
  hooks/use-acao-formulario.ts  # liga <form> a uma Server Action
  lib/
    orcamento/calculos.ts   # ⭐ ÚNICA fonte dos cálculos (tela e servidor) + testes
    orcamento/regras.ts     # status, transições, unidades, numeração #0001
    moeda.ts datas.ts       # R$ e datas pt-BR (+ testes)
    busca.ts                # busca sem acento
    pdf/                    # documento react-pdf, geração, nome do arquivo, fontes Inter (+ testes)
    prestador.ts            # nomeDeExibicao, perfilCompleto (puros: usados no app e no PDF)
    pix/chave.ts            # ⭐ regra ÚNICA de chave PIX (normaliza + valida), Perfil e QR
    pix/brcode.ts           # gerador do PIX Copia e Cola (EMV/TLV + CRC16) (+ testes)
    pix/orcamento.ts        # qual PIX gerar p/ o orçamento (sinal ou total) (+ testes)
    pix/qrcode.ts           # QR Code como caminho SVG (página e PDF)
    whatsapp.ts             # telefone → wa.me, link com mensagem, textos padrão (+ testes)
    envio-orcamento.ts      # monta link público + link do WhatsApp (servidor)
    url-app.ts              # base dos links (NEXT_PUBLIC_APP_URL) · copiar.ts (clipboard)
    supabase/               # clientes browser/server/proxy, env, tradução de erros
    dados/                  # leitura de dados no servidor (com React cache)
    validacoes/             # schemas zod (comum, auth, perfil, cliente, orcamento)
    types/database.ts       # TODOS os tipos do banco (manuais por enquanto)
    acoes.ts                # EstadoAcao<T>, erro(), sucesso(), errosPorCaminho()
    formatacao.ts rotas.ts
supabase/migrations/        # SQL colado manualmente no SQL Editor do Supabase
```

## Decisões tomadas

### Gerais (Etapa 1)

- **Proxy, não middleware**: no Next 16 o arquivo se chama `src/proxy.ts` (mesma função).
  Ele renova a sessão com `getClaims()` e faz os redirecionamentos de acesso. As páginas
  do painel também checam o usuário (`exigirUsuario`) — o proxy não é a única barreira.
- **Segurança no banco**: RLS em todas as tabelas; o app usa só a chave publicável.
  Nenhuma chave secreta (service role) no projeto.
- **Perfil criado por trigger** (`criar_prestador_ao_cadastrar`) com o `nome` enviado em
  `options.data` no `signUp`. Por isso não existe policy de insert em `prestadores`.
- **Formulários**: Server Action + `useActionState` via `useAcaoFormulario`, que usa
  `onSubmit` + `startTransition` para o React **não limpar os campos** quando há erro.
  Toda action devolve `EstadoAcao<T>` (`status`, `mensagem`, `errosCampos`, `dados`).
  `errosCampos` usa o caminho do campo como chave (`"itens.0.quantidade"`).
- **Validação dupla**: os schemas zod em `lib/validacoes` rodam no servidor; regras
  usadas no cliente (ex.: `validarLogo`, `lerQuantidade`) são as mesmas funções.
- **Dados normalizados**: telefone salvo só com dígitos (`11987654321`); chave PIX salva
  no formato oficial (CPF/CNPJ só dígitos, telefone `+55...`, e-mail/EVP minúsculos).
  Máscaras só na interface (`lib/formatacao.ts`).
- **Logo**: enviada no mesmo formulário do perfil (limite de body das Server Actions
  ajustado para 3 MB). Caminho `logos/<user_id>/logo-<timestamp>.<ext>` — nome único evita
  cache velho; as antigas são apagadas **depois** que o banco aponta para a nova.
- **Cadastro com ou sem confirmação de e-mail**: se o Supabase devolver sessão, vai direto
  ao painel; senão mostra "confira seu e-mail". `/auth/callback` aceita `code` e `token_hash`.
- **Redirecionamento seguro**: `?next=` passa por `destinoSeguro()` (evita open redirect).
- **Idioma**: interface, mensagens, nomes de domínio (tabelas, colunas, funções) em
  português. Termos técnicos do framework continuam em inglês.

### Cache Components e navegação instantânea (importante)

- **Toda página do painel tem casca síncrona** (título, botões, link de voltar) e os
  dados ficam em componentes `async` filhos, cada um dentro do seu `<Suspense>` com um
  esqueleto no formato exato do conteúdo (`components/painel/esqueletos.tsx`).
  Padrão: `export default function Pagina({ params }) { return <>casca<Suspense
fallback={<Esqueleto/>}><Dados params={params}/></Suspense></> }`. Nunca faça `await`
  no corpo do componente da página.
- **Não há `<Suspense>` em volta de `{children}` no layout do painel, de propósito**:
  numa navegação só re-renderiza o que está abaixo do layout compartilhado, e um
  fallback do layout (já revelado) não reaparece — a troca ficava parada esperando os
  dados (era o Insight "uncached data during a navigation"). Sem ele, um `await` no
  topo de uma página quebra o build — é a proteção contra regressão.
- Dados do usuário **nunca** vão para `"use cache"`: são sempre por requisição.
- `createClient()` do servidor chama **`connection()`**: com `partialPrefetching`, os
  cookies ficam disponíveis no pré-render do App Shell, e o Supabase usa `Date.now()`
  para validar o token — o que é proibido no pré-render. Não remova.
- Medido (build de produção, dados com 600 ms de atraso): antes, cada troca de página
  ficava parada ~800 ms; depois, a casca aparece em 30–90 ms e os dados chegam em
  streaming. No dev não há prefetch, então é mais lento (~200 ms) — normal.
- `usePathname()` em rotas dinâmicas também exige `<Suspense>` (ver `navegacao.tsx`).
- Nunca use `new Date()`, `Date.now()` ou `Math.random()` em componentes renderizados.
  Datas "de hoje" são calculadas no servidor (depois dos dados) e passadas por props.
- `error.tsx` usa `retry()` (recarrega os dados), não `reset()`.

### Dinheiro e cálculos (Etapa 2)

- **Dinheiro sempre em centavos (integer)**, no banco e no código. Nunca float.
  Conversão para texto só na tela (`formatarMoeda`); leitura de texto por manipulação
  de string (`lerMoeda`), sem float.
- **Um único módulo de cálculo** (`lib/orcamento/calculos.ts`, funções puras e testadas):
  total do item (quantidade convertida em centésimos inteiros antes de multiplicar),
  subtotal, desconto (limitado ao subtotal), total e sinal. Arredondamento: meio para cima.
  O mesmo módulo alimenta o resumo em tempo real, a validação do servidor e as listagens.
- **Totais não são guardados no banco**: são sempre derivados dos itens. Assim nunca
  existe um total divergente dos itens. As listagens trazem os itens junto e calculam.
- **Servidor nunca confia no navegador**: a action recebe os dados brutos (quantidade como
  texto digitado), valida com zod e recalcula. O desconto é rejeitado se passar do subtotal.
- Input de dinheiro com máscara "de maquininha" (`InputMoeda`): dígitos entram pela
  direita; o valor do componente é sempre em centavos.

### Banco (Etapa 2)

- **Numeração por prestador** via contador `prestadores.ultimo_numero_orcamento`
  incrementado por trigger: serializa inserções simultâneas (lock na linha) e **não
  reaproveita** números de orçamentos excluídos. O trigger ignora qualquer `numero`
  enviado; outro trigger impede alterar `numero` e `prestador_id`.
- **FK composta** `orcamentos (cliente_id, prestador_id) → clientes (id, prestador_id)`:
  garante no banco que o cliente do orçamento é do mesmo prestador. `on delete restrict`
  impede excluir cliente com orçamentos (erro **23001**; tratar junto com 23503 via
  `violouChaveEstrangeira`).
- **Salvar orçamento + itens é atômico** pela função SQL `salvar_orcamento` (security
  invoker, então o RLS vale). Na edição, os itens são apagados e regravados em ordem.
- **Aprovados/recusados ficam congelados no banco** (triggers `proteger_orcamento` e
  `proteger_itens_orcamento`): só podem ser duplicados ou excluídos. A exclusão marca a
  transação (`orcai.excluindo_orcamento`) para a cascata dos itens passar.
- Transições de status permitidas (`proximosStatus`): rascunho → enviado/aprovado/recusado;
  enviado → aprovado/recusado. Aprovar/recusar pede confirmação (é definitivo).
- Erros levantados pelas funções SQL (`raise exception 'orcamento_finalizado'`) são
  traduzidos em `lib/supabase/erros.ts`.
- As migrations foram validadas com PGlite (Postgres em WASM) simulando `auth` e `storage`
  do Supabase: idempotência, RLS entre dois prestadores, numeração, travas e cascatas.

### Interface (Etapa 2)

- **Navegação**: barra fixa embaixo no celular (Início, Orçamentos, Clientes, Perfil);
  links no cabeçalho a partir do `md`.
- **Listas**: cartões no celular, tabela a partir do `md` (`TabelaOrcamentos`).
- **Busca e filtros no navegador**: as listagens carregam até 500 registros do prestador
  e filtram na hora (busca sem acento). Mover para o servidor quando houver paginação.
- **Cliente no orçamento**: busca + cadastro num diálogo, sem sair da página. O formulário
  de cliente é o mesmo da lista de clientes (`DialogoCliente`).
- **Resumo sempre visível**: barra fixa acima da navegação no celular, lateral no `lg`.
- Selects nativos (`SelectNativo`) no lugar de dropdowns customizados: melhores no celular.
- Chaves de itens com contador local (não `crypto.randomUUID`, que não existe em
  `http://` fora do localhost); ids de campos por posição, estáveis entre SSR e navegador.

### PDF (Etapa 3)

- **Gerado no servidor** com `@react-pdf/renderer` em `app/painel/orcamentos/[id]/pdf/route.ts`.
  Não logado → o proxy redireciona (e a rota ainda responde 401); orçamento de outro
  prestador ou inexistente → 404. `?download=1` troca `inline` por `attachment`.
  `Cache-Control: private, no-store` (documento com dados pessoais).
- **Documento puro** (`lib/pdf/documento-orcamento.tsx`): recebe tudo por props, sem banco
  nem rede — por isso é testável no Vitest. Valores só via `calculos.ts`, `moeda.ts`,
  `datas.ts`, `formatacao.ts`. Nada de cálculo próprio.
- **Fonte Inter** (WOFF, subconjunto latino, licença OFL em `lib/pdf/fontes/OFL.txt`),
  lida do disco via `process.cwd()`; `outputFileTracingIncludes` em `next.config.ts`
  garante que entre no pacote da rota em produção. Hifenização desligada (a padrão é inglês).
- ⚠️ **Não use `lineHeight` no PDF**: com a Inter, qualquer `lineHeight` faz o react-pdf
  4.9 sumir com o rodapé fixo (descoberto inspecionando os PDFs; coberto por teste que
  extrai o texto com `pdfjs-dist` e confere "Página X de Y" em todas as páginas).
- **Quebra de página**: cabeçalho da tabela com `fixed` (repete em cada página onde a
  tabela continua), linhas com `wrap={false}` (nunca cortadas), resumo e caixa PIX com
  `wrap={false}`. Tabela sem borda externa (ela desceria pelo espaço vazio ao quebrar).
- **Rodapé** é o primeiro filho da página, `fixed` e absoluto: "Página X de Y" e "Gerado com Orçaí".
- **Logo** baixada no servidor com timeout de 5 s e limite de tamanho; qualquer falha →
  PDF sai só com o nome (nunca quebra por causa da logo).
- **Data de emissão** = `created_at` do orçamento (o documento não muda a cada download).
- Nome do arquivo: `orcamento-0001-nome-do-cliente.pdf` (`nomeArquivoPdf`, sem acentos).
- Para inspecionar visualmente: `PDF_AMOSTRA=caminho.pdf npm test` grava um PDF de 60 itens.

### Link público e WhatsApp (Etapa 4)

- **Tabelas continuam fechadas para `anon`.** O cliente só vê o orçamento por duas
  funções `SECURITY DEFINER` (search_path fixo) liberadas para anon: `obter_orcamento_publico`
  (só os campos que o cliente precisa, sem ids; rascunho/token errado → null) e
  `responder_orcamento` (só status `enviado` e dentro da validade; `for update` contra
  respostas simultâneas). O painel usa `preparar_envio_orcamento` (security invoker → RLS).
- **Token**: 24 bytes de `pgcrypto.gen_random_bytes` (192 bits) em base64url, 32 caracteres,
  `unique`. Gerado no primeiro envio e reaproveitado; duplicar não copia o token.
- **Visualização NÃO é registrada no servidor**: o robô de prévia do WhatsApp abre o link
  assim que o prestador manda a mensagem e marcaria tudo como "visualizado". O servidor
  sempre lê com `p_registrar_visualizacao = false`; o componente `RegistrarVisualizacao`
  chama a action no navegador depois de carregar (robôs não executam JS). Visitas do
  próprio prestador logado também não contam (o banco compara com `auth.uid()`).
- `proteger_orcamento` (migration 003) passou a permitir **só** preencher `visualizado_em`
  em aprovados/recusados (o cliente pode abrir depois de o prestador aprovar à mão).
- **Envio**: "Copiar link" também passa o rascunho para enviado (sem isso o link daria 404).
  No primeiro envio, a aba do WhatsApp é aberta **no clique** e recebe a URL depois que o
  servidor gera o token (senão o Safari bloqueia como pop-up). Com token, é um `<a>` direto.
- Copiar usa `navigator.clipboard` quando há contexto seguro e cai para `execCommand`
  (celular em `http://192.168.x.x` não tem a API moderna); se falhar, mostra o link num campo.
- Mudança manual de status no painel também grava `enviado_em`/`respondido_em`
  (linha do tempo coerente). Não há notificação push: o prestador vê a resposta no painel.
- **Datas**: vencido = `valido_ate < hoje no Brasil` (válido até hoje ainda vale), mesma
  regra no SQL (`hoje_brasil()`) e no app (`orcamentoVencido`, `clientePodeResponder`).
- **Prévia do link**: `generateMetadata` monta "Orçamento Nº 0001 – Empresa" + total. O
  Next espera os metadados para robôs sem JS (WhatsApp está na lista `htmlLimitedBots`),
  então eles saem no `<head>`. `/o/*` tem `robots: noindex` (layout) e o PDF, `X-Robots-Tag`.
- **404 do token**: para robôs a resposta é 404; no navegador a página chega por streaming,
  que sempre começa com 200 (o Next adiciona `noindex`). Comportamento documentado do Next.
- **PDF público** reutiliza o mesmo documento: o PDF e os blocos de conteúdo recebem o tipo
  mínimo `OrcamentoDocumento` (sem ids), atendido pelo painel e pela página pública.
- `allowedDevOrigins` libera IPs de rede local no dev (teste no celular pelo Wi-Fi).
- Verificado de ponta a ponta num navegador automático com um Supabase falso (copiar
  link, WhatsApp, prévia do robô, aprovar, recusar com motivo, vencido, 404, PDF e linha
  do tempo) e as funções SQL no PGlite (53 casos, incluindo isolamento entre prestadores).

### PIX do sinal (Etapa 5)

- **QR Code estático, sem gateway**: o BR Code é gerado no servidor a partir da chave do
  prestador; a confirmação do pagamento é **manual** (o prestador confere o extrato e marca
  "Sinal recebido"). Evolução futura: gateway (Mercado Pago, Efí) com PIX dinâmico e webhook.
- **Gerador próprio** (`lib/pix/brcode.ts`, puro): EMV/TLV do Manual de Padrões para
  Iniciação do Pix — 00, 26 (GUI br.gov.bcb.pix + chave), 52=0000, 53=986, 54 (valor com
  ponto, omitido se 0), 58=BR, 59 nome (≤25), 60 cidade (≤15), 62/05 txid (≤25) e 63 CRC16
  CCITT-FALSE (0x1021, inicial 0xFFFF). Nome/cidade sem acentos e só letras/números/espaço.
- **Testado contra o exemplo oficial do BCB** (reproduzido byte a byte, CRC 1D3D) e o vetor
  padrão do CRC ("123456789" → 29B1). Um teste pinta o QR desenhado numa imagem e o
  decodifica com **jsQR** (leitor independente): prova que o DESENHO é legível.
- **Chave**: `normalizarChavePix` é a regra única — o Perfil valida com ela ao salvar e o
  gerador normaliza com ela (CPF/CNPJ com dígitos verificadores; telefone +55; e-mail
  minúsculo ≤77; EVP no formato UUID, como está).
- **Valor**: sinal (`calcularResumo`); com sinal 0%, o valor total (`pixDoOrcamento`).
- **txid estável**: `ORC` + número (4 dígitos) + 8 caracteres hex do id do orçamento
  (aleatórios do UUID v4). O mesmo orçamento gera sempre o mesmo QR. A página pública recebe
  só esse trecho (`referencia_pix`), nunca o id.
- **Cidade é obrigatória** no BR Code: sem ela (ou sem chave válida) não há QR — o cliente vê
  só a chave em texto e o painel explica o motivo com link para o Perfil, que avisa quando
  a cidade está vazia. `perfilCompleto` passou a exigir cidade.
- **QR como SVG desenhado por nós** (`desenharQrCode` → um único `<path>`, correção M,
  margem de 4 módulos): o mesmo traço vira `<svg>` na página e `<Svg>` no PDF.
- **Banco (004)**: `sinal_recebido_em` com constraint `orcamentos_sinal_so_aprovado`;
  `proteger_orcamento` aceita alterar só `visualizado_em` e `sinal_recebido_em` em
  finalizados; `obter_orcamento_publico` devolve `sinal_recebido` (booleano) e
  `referencia_pix`. Testado no PGlite (20 casos novos + os 53 da 003).
- **Página do cliente**: antes de aprovar, só a chave em texto; aprovado → bloco "Pague o
  sinal via PIX" no topo (QR + Copia e Cola); sinal recebido → "Sinal recebido. Obrigado!".
- **PDF**: o documento calcula o PIX pela mesma regra (recebe só `referenciaPix`).
- Verificado no navegador: QR da tela escaneado com jsQR = Copia e Cola; marcar/desfazer o
  sinal refletem na página do cliente; sinal 0% cobra o total; sem cidade não há QR.

## Convenções

- Mensagens de erro em português, claras e acionáveis ("Digite um telefone válido com DDD").
- Novos formulários: reutilize `Campo`/`CampoBase`, `BotaoEnviar`, `MensagemFormulario` e
  `useAcaoFormulario`. Nada de lógica de validação duplicada.
- Confirmações destrutivas: `ConfirmarAcao` (com `bloqueio` quando a ação não é permitida).
- Listas vazias: `EstadoVazio` com uma ação clara.
- Novas tabelas: sempre em nova migration numerada (`005_...sql`), idempotente, com RLS.
- Acesso público a dados: nunca abrir tabelas para anon; usar função SECURITY DEFINER
  com search_path fixo que devolve só o necessário (e testar no PGlite).
- Tipos do banco só em `lib/types/database.ts`. Rotas só via `lib/rotas.ts`.
- Regra de negócio nova = função pura em `lib/` + teste no Vitest.
- Página nova no painel = casca síncrona + `<Suspense>` com esqueleto em volta dos dados.

## Roadmap

- [x] **Etapa 1** — Base: projeto, login, cadastro e perfil do prestador
- [x] **Etapa 2** — Clientes e orçamentos com itens
- [x] **Etapa 3** — PDF profissional do orçamento (+ navegação instantânea no painel)
- [x] **Etapa 4** — Link público com aprovar/recusar e envio por WhatsApp
- [x] **Etapa 5** — QR Code PIX estático do sinal
- [ ] **Etapa 6** — IA que transforma texto ou áudio em itens de orçamento
- [ ] **Etapa 7** — Painel com métricas
- [ ] **Etapa 8** — README final, testes e deploy
