# FHDOD — Interface web (frontend)

Interface web do **FHDOD — Sistema de Gestão da Experiência do Paciente** (Fundação Hospitalar Dr. Oswaldo Diesel): pesquisa pública por QR Code ou link, manifestação, área administrativa (usuários, auditoria, setores, escalas, pesquisas), Ouvidoria, painéis com NPS e relatórios Excel. A **TV Wall ainda não existe no frontend** (veja [Situação das funcionalidades](#situação-das-funcionalidades)).

- **Aplicação publicada:** <https://fhdod-frontend.vercel.app> (Vercel)
- **API usada pela publicação:** `https://fhdod-experiencia-paciente.onrender.com` (endereço público, incluído no build por `VITE_API_URL`)
- **Identidade visual:** branco e vermelho, da Fundação Hospitalar Dr. Oswaldo Diesel (veja [Identidade visual](#identidade-visual)).
- **Design (Figma):** [sistema-hospital](https://www.figma.com/design/kcRMvRhHs8IYRfsZkv1BLZ/sistema-hospital), atualizado pelo plugin próprio em [`figma-plugin/`](figma-plugin/README.md).

Este é um **repositório independente**, separado do repositório da API. Ele tem as próprias dependências, lockfile, configurações (TypeScript, Vite, Vitest, ESLint, Prettier, Playwright) e variáveis de ambiente. A comunicação com a API REST do FHDOD acontece **somente por HTTP** (endpoints `/api/v1`), no endereço configurado em `VITE_API_URL`; o frontend não importa código da API.

> **Ambiente acadêmico.** Projeto integrado do curso Técnico em Informática da ETE Monteiro Lobato – CIMOL. Usa somente dados fictícios.

## Tecnologias

| Camada    | Tecnologias                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface | React 19.3, TypeScript 5.9 (strict), Vite 8, Tailwind CSS 4.3, React Router 8, TanStack Query 5, React Hook Form 7, Lucide React, qrcode.react 4      |
| Sessão    | autenticação da própria API (E44 login, E45 renovação, E46 logout), consumida por HTTP; sem SDK de terceiros                                          |
| Qualidade | Vitest 5, React Testing Library, jsdom, Playwright 1.63 (E2E), jsqr, ESLint 10 + typescript-eslint, Prettier 3 (com ordenação de classes do Tailwind) |

## Pré-requisitos

- **Node.js 24 LTS** (versão em `.nvmrc`; também verificado com Node 22.12+) e **npm 10+**.
- A **API do FHDOD** em execução para usar o sistema (localmente em `http://localhost:3333`).
- O login administrativo é feito pela própria API: não há serviço de autenticação separado para configurar no frontend.

## Estrutura

```text
fhdod-frontend/                  raiz do repositório
├── src/
│   ├── main.tsx                 ponto de entrada (React Router + TanStack Query)
│   ├── app/                     rotas (routes.tsx), layouts público e administrativo, AdminArea
│   │                            (telas administrativas e proteção por permissão), 404, query-client
│   ├── components/ui/           componentes reutilizáveis (botão, campos, diálogos, alerta,
│   │                            estados de carregamento/erro/vazio, etiqueta)
│   ├── features/<domínio>/      páginas, componentes da área e <domínio>-api.ts (tipos e hooks)
│   │   ├── auth/                login, sessão (AuthProvider, auth-client), guardas de rota, troca de senha
│   │   ├── home/                página inicial e situação da API
│   │   ├── public-survey/       pesquisa pública e manifestação do paciente
│   │   ├── dashboard/           painel geral e painel por setor
│   │   ├── manifestations/      Ouvidoria (lista, detalhe, tratamento, contato)
│   │   ├── reports/             exportação de relatórios Excel
│   │   ├── surveys/             cadastro e edição de pesquisas, QR Code e cartaz
│   │   ├── sectors/             setores e equipes
│   │   ├── shifts/              escala/turnos e importação de escalas
│   │   ├── users/               usuários
│   │   └── audit/               auditoria
│   ├── lib/                     env (variáveis VITE_*), api-client (cliente HTTP único),
│   │                            formatação pt-BR, erros de formulário e estado de navegação
│   ├── styles/                  Tailwind e tokens visuais
│   └── test/                    setup do Vitest e helpers dos testes de componentes
├── e2e/                         testes ponta a ponta (Playwright) e environment.ts (portas e pastas)
├── figma-plugin/                plugin do Figma Desktop que atualiza o arquivo de design para a
│                                identidade branco e vermelho e cria as telas ausentes (README próprio)
├── docs/relatorios/             relatórios técnicos das etapas
├── public/                      arquivos estáticos
├── index.html
├── package.json · package-lock.json
├── tsconfig.json · tsconfig.base.json · tsconfig.app.json · tsconfig.node.json
├── vite.config.ts               Vite, proxy opcional de desenvolvimento e Vitest
├── vercel.json                  fallback de SPA na Vercel (todas as rotas → index.html)
├── playwright.config.ts · eslint.config.js · .prettierrc.json · .editorconfig · .nvmrc
├── .env.example · .gitignore
└── README.md
```

`dist/`, `coverage/`, `playwright-report/`, `test-results/` e `playwright/.cache/` são gerados e não versionados.

## Arquitetura

- **SPA** em React 19, sem renderização no servidor. `src/app/routes.tsx` define as rotas com React Router (modo de dados).
- **Divisão do código:** a pesquisa pública (`/p/:slug`) e a área administrativa são carregadas sob demanda em pedaços separados. O cliente de autenticação e a sessão existem **somente** na área administrativa (`AdminRoot` em `src/app/AdminArea.tsx`); a pesquisa pública não carrega nada da sessão.
- **Dados do servidor:** TanStack Query (cache, novas tentativas, atualização periódica). Cada domínio tem um `<domínio>-api.ts` com tipos e hooks.
- **HTTP:** todas as chamadas passam por `src/lib/api-client.ts` (`apiRequest`, `apiGet`, `apiDownload`). As rotas administrativas usam o `request` do `AuthProvider`, que injeta o token e renova a sessão quando preciso.
- **Erros:** respostas fora do sucesso viram `ApiError` com `status`, `code`, `message`, `requestId` e `details` (formato `{ error: { code, message, details, requestId } }` da API). Falha de rede vira `NETWORK_ERROR`; corpo inesperado vira `UNEXPECTED_RESPONSE`. `src/lib/errors.ts` leva os erros de validação (400 com `details`) e de conflito (409) aos campos do formulário e mostra o `requestId` nos avisos gerais.
- **Permissões:** o menu e as telas são filtrados pelas permissões devolvidas em `GET /api/v1/me` (`RequirePermission`); o controle de acesso real é sempre do backend.
- **Formulários:** React Hook Form. **Estilo:** Tailwind CSS 4. **Ícones:** Lucide. **QR Code:** qrcode.react.

## Identidade visual

Branco e vermelho, seguindo a identidade da Fundação Hospitalar Dr. Oswaldo Diesel (antes: branco e azul). As cores ficam centralizadas como tokens do Tailwind em `src/styles/index.css` (`@theme`); os componentes usam as classes `*-brand-*`, `*-danger-*` e `*-info-*`, sem valores soltos.

| Token          | Valor     | Uso                                                                          | Contraste (WCAG)       |
| -------------- | --------- | ---------------------------------------------------------------------------- | ---------------------- |
| `brand-700`    | `#c8102e` | cabeçalho, botão primário, links, seleção, barras e linha dos gráficos, foco | 5,88:1 sobre branco    |
| `brand-800`    | `#a50d26` | hover, item ativo do menu (texto sobre branco)                               | 7,82:1 sobre branco    |
| `brand-50`     | `#fdf2f4` | fundos de destaque (linha selecionada, oferta de manifestação)               | —                      |
| `brand-100`    | `#fde4e7` | texto secundário sobre o cabeçalho vermelho                                  | 4,88:1 sobre brand-700 |
| `danger-700`   | `#991b1b` | erros, campos inválidos, botão de perigo                                     | 8,31:1 sobre branco    |
| `danger-800`   | `#7f1d1d` | hover do botão de perigo                                                     | 10,02:1 sobre branco   |
| `info-700/800` | `#1d4ed8` | avisos informativos e etiquetas de situação "info" (continuam azuis)         | 6,70:1 sobre branco    |
| `info-50/950`  | —         | fundo e texto do aviso informativo                                           | —                      |

Regras adotadas:

- **Branco predomina** (superfícies, cartões, campos); o fundo da página continua `slate-50` e textos, bordas e divisórias continuam nos tons neutros (`slate`, `neutral-border`).
- **Erro × marca:** o perigo usa um vermelho-escuro distinto do vermelho da marca. Como antes, o significado nunca depende só da cor (ícone e texto, RNF08) e ações destrutivas sempre pedem confirmação.
- **Informação continua azul:** com a marca vermelha, um aviso informativo vermelho pareceria erro.
- **Sucesso** (verde) e **aviso** (âmbar) não mudaram.
- **Foco:** contorno de 2 px vermelho; dentro do cabeçalho vermelho, branco (RNF07).
- Também mudaram o `favicon.svg` e a `theme-color` do `index.html`.
- **Pendente:** a cor exata do manual da instituição não foi encontrada em fonte pública; `#c8102e` deve ser confirmado com a FHDOD. Para trocar, altere os tokens em `src/styles/index.css` (e `VARIABLE_TARGETS` no plugin do Figma).

## Páginas e rotas

| Rota                                | Tela                                                  | Acesso                           |
| ----------------------------------- | ----------------------------------------------------- | -------------------------------- |
| `/`                                 | página inicial com a situação da API (`GET /health`)  | público                          |
| `/p/:slug` (`?origem=qr` ou `link`) | pesquisa pública de satisfação e manifestação         | público, sem login e sem cookies |
| `/login`                            | login administrativo                                  | público                          |
| `/trocar-senha`                     | troca de senha (obrigatória no primeiro acesso)       | sessão                           |
| `/painel`                           | dashboard geral                                       | `dashboard:read`                 |
| `/painel/setores/:sectorId`         | dashboard por setor                                   | `dashboard:read`                 |
| `/ouvidoria/manifestacoes`          | lista de manifestações                                | `manifestations:read`            |
| `/ouvidoria/manifestacoes/:id`      | detalhe e tratamento da manifestação                  | `manifestations:read`            |
| `/relatorios`                       | exportação de relatórios Excel                        | alguma permissão `reports:*`     |
| `/admin/usuarios`                   | usuários                                              | `users:read`                     |
| `/admin/auditoria`                  | auditoria                                             | `audit_logs:read`                |
| `/admin/setores`                    | setores e equipes                                     | `teams:create`                   |
| `/admin/turnos`                     | escala e turnos                                       | `shifts:read`                    |
| `/admin/escalas/importar`           | importação de escalas (CSV)                           | `rosters:import`                 |
| `/admin/pesquisas`                  | lista de pesquisas                                    | `surveys:read`                   |
| `/admin/pesquisas/:id`              | edição de pesquisa (dados, perguntas, publicação, QR) | `surveys:update`                 |
| `/admin/pesquisas/:id/cartaz`       | cartaz A4 com QR Code, sem o layout administrativo    | `surveys:read`                   |
| qualquer outra                      | página 404                                            | público                          |

Depois do login, o Superadministrador vai para `/admin/usuarios`; os demais perfis vão para `/painel`. Perfis: Superadministrador, Administrador de setor, Gestão, Ouvidoria e Visualizador (`src/features/auth/auth-types.ts`).

**Não há rota de TV Wall.** Qualquer caminho como `/tv` cai na página 404.

## Situação das funcionalidades

Levantamento feito pelo código, pelos testes automatizados e por acesso à aplicação publicada (novembro de 2026). "Implementada" significa que a tela chama os endpoints reais da API e tem testes de componentes e/ou E2E; as rotas administrativas da publicação não foram exercitadas com login.

| Funcionalidade                 | Situação                        | O que existe                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pesquisa pública de satisfação | Implementada                    | `GET /public/surveys/:slug`, nota 0–10 e perguntas por etapa (1–5), envio com `Idempotency-Key` (`POST /public/responses`), progresso no `sessionStorage`, aviso de inatividade (3 min + 60 s) que apaga as respostas, retorno ao início 30 s após a confirmação, mensagens para 404, 410 e 429. |
| Manifestação pelo paciente     | Implementada                    | formulário após a avaliação (`POST /public/manifestations`): tipo, descrição, anonimato por padrão, contato opcional com aceite, protocolo na confirmação.                                                                                                                                       |
| Autenticação                   | Implementada                    | login, renovação, logout, troca de senha e troca obrigatória pela API (veja [Autenticação](#autenticação)).                                                                                                                                                                                      |
| Dashboard geral                | Implementado                    | `/dashboard/summary`, `/sectors`, `/trends`: filtros na URL, cartões com n, distribuição 0–10, setores, tendência, comparação com o período anterior, atualização a cada 60 s com a aba visível, botões de exportação.                                                                           |
| Dashboard por setor            | Implementado                    | `/dashboard/questions`, `/shifts`, `/teams`: perguntas por etapa da jornada, turnos, equipes e cobertura.                                                                                                                                                                                        |
| Ouvidoria                      | Implementada                    | lista com filtros e paginação; detalhe com status, prioridade, providências, notas, linha do tempo; visualização de contato por ação explícita (auditada pela API) e eliminação do contato com motivo.                                                                                           |
| Relatórios                     | Implementados                   | `GET /reports/export`: respostas, indicadores e manifestações em Excel (.xlsx), tipo conforme a permissão do perfil; limites informados pela API.                                                                                                                                                |
| Usuários                       | Implementado                    | lista, cadastro, edição, desativação e redefinição de senha com senha temporária.                                                                                                                                                                                                                |
| Auditoria                      | Implementada                    | `GET /admin/audit-logs` com filtros (até 366 dias) e paginação.                                                                                                                                                                                                                                  |
| Setores e equipes              | Implementados                   | cadastro e edição de setores (Superadministrador) e de equipes (também o Administrador de setor, no próprio escopo).                                                                                                                                                                             |
| Escalas e turnos               | Implementados                   | escala por dia (intervalo de até 62 dias), cadastro e edição de turnos; importação de CSV com modelo para baixar, pré-validação (erros por linha, sem gravar) e confirmação.                                                                                                                     |
| Pesquisas, QR Code e cartaz    | Implementados                   | criação, edição de dados e perguntas (por etapa da jornada), publicação de versão, link e QR Code (PNG e SVG) e cartaz A4 para impressão.                                                                                                                                                        |
| Página inicial                 | Parcial                         | mostra a situação da API, mas o texto "Estado do desenvolvimento" ainda diz que pesquisa, painel, Ouvidoria, relatórios e TV Wall "serão disponibilizados nas próximas etapas", o que está desatualizado (exceto para a TV Wall). Não há link para o login.                                      |
| **TV Wall**                    | **Pendente — não implementada** | não existe rota, página nem componente. Só aparece em um comentário de `AdminArea.tsx` e no texto da página inicial.                                                                                                                                                                             |

## Instalação

```bash
git clone <url-deste-repositório> fhdod-frontend
cd fhdod-frontend
npm ci               # instala as dependências (package-lock.json)
cp .env.example .env
```

## Variáveis de ambiente

Arquivo `.env` **nesta pasta** (copiado de `.env.example`). Tudo que começa com `VITE_` é incluído no JavaScript enviado ao navegador: **nunca coloque segredos ou credenciais privadas aqui**.

| Variável       | Uso                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | endereço da API, **sem** `/api/v1` (o cliente HTTP acrescenta o prefixo). Desenvolvimento: `http://localhost:3333`. Produção: `https://…` (obrigatório). Veja abaixo. |
| `VITE_APP_ENV` | `development`, `test` ou `production`                                                                                                                                 |

As variáveis são lidas e validadas em um único lugar, [`src/lib/env.ts`](src/lib/env.ts); todas as requisições à API passam pelo cliente HTTP de [`src/lib/api-client.ts`](src/lib/api-client.ts). Não há URLs da API espalhadas pelo código.

### URL da API

- **Padrão (recomendado):** `VITE_API_URL=http://localhost:3333`. O navegador chama a API diretamente; a API precisa liberar a origem do frontend no CORS (variável `CORS_ORIGIN` da API, que localmente já inclui `http://localhost:5173`). É o mesmo modo usado na publicação, com o frontend e a API em endereços diferentes.
- **Mesma origem:** com `VITE_API_URL` vazia, as chamadas vão para `/api/v1` no próprio endereço da página. Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:3333` (proxy apenas de desenvolvimento; outro destino com `VITE_PROXY_TARGET`). Em produção, isso exige um proxy reverso que encaminhe `/api` para a API.

Na publicação, cadastre o endereço público do frontend em `CORS_ORIGIN` e em `PUBLIC_APP_URL` da API (links e QR Code das pesquisas).

## Autenticação

O login administrativo usa a autenticação da própria API (JWT de acesso + token de renovação de uso único), sempre por HTTP e sem nenhuma variável própria no frontend. A implementação fica em [`src/features/auth/auth-client.ts`](src/features/auth/auth-client.ts) e [`AuthProvider.tsx`](src/features/auth/AuthProvider.tsx):

- **Login** — `POST /api/v1/auth/login` com e-mail e senha. Qualquer recusa (401, 403 ou 400) mostra a mesma mensagem genérica; 429 mostra o aviso de muitas tentativas. A senha nunca é guardada.
- **Sessão** — os tokens ficam no `sessionStorage` da aba (chave `fhdod-admin-auth`): sobrevivem ao recarregamento e são apagados ao fechar a aba ou sair. O token de acesso vai somente no cabeçalho `Authorization: Bearer` (sem cookies). O perfil e as permissões vêm sempre do `GET /api/v1/me`.
- **Renovação** — `POST /api/v1/auth/refresh` cerca de 1 minuto antes de o token de acesso expirar (prazo calculado com o `expiresIn` da resposta, no relógio do navegador), ou depois de um 401 da API, com uma única nova tentativa da requisição. O token de renovação é **rotacionado**: cada resposta traz um novo, gravado antes de liberar as requisições. Requisições simultâneas compartilham **uma só** renovação, para nunca reapresentar um token já trocado.
- **Fim da sessão** — renovação recusada (401) leva ao login com o aviso "Sua sessão terminou"; 403 `ACCOUNT_DISABLED` leva ao aviso de conta desativada. Falha de rede na renovação não encerra a sessão (permite tentar de novo).
- **Logout** — `POST /api/v1/auth/logout` revoga a sessão no servidor; o armazenamento e o cache de consultas em memória são apagados mesmo sem rede.
- **Troca de senha** — `POST /api/v1/me/password` encerra as outras sessões e mantém a atual; a interface só recarrega o perfil.

Ocultar menus e telas pelas permissões é conveniência de navegação: o controle de acesso é sempre do backend.

## Execução

Com a API rodando em outro terminal (no projeto da API: `npm run dev`):

```bash
npm run dev          # http://localhost:5173
```

A página inicial mostra "API disponível" quando a comunicação com a API está funcionando.

## Testes e qualidade

| Comando                            | O que faz                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run check`                    | formatação, lint, typecheck, testes e build, em sequência                           |
| `npm run typecheck`                | TypeScript (`tsc -b`: aplicação, configurações e E2E)                               |
| `npm run lint`                     | ESLint sem avisos tolerados; `npm run lint:fix` corrige                             |
| `npm run format:check`             | Prettier; `npm run format` corrige                                                  |
| `npm test`                         | testes de componentes e unidade (Vitest + jsdom); não precisam da API nem do `.env` |
| `npm run test:coverage`            | cobertura                                                                           |
| `npm run test:e2e`                 | ponta a ponta com Playwright, Chrome instalado e API local (veja abaixo)            |
| `cd figma-plugin && npm run check` | plugin do Figma: tipos (`@figma/plugin-typings`) e testes com a API simulada        |

Se o Vitest acusar `Timeout waiting for worker to respond` em máquina sobrecarregada, use `npx vitest run --maxWorkers=2`.

Situação verificada em 05/11/2026: `npx vitest run --maxWorkers=2` → **18 arquivos, 119 testes, todos aprovados**. Os testes de componentes e unidade cobrem o cliente HTTP, as variáveis de ambiente, a formatação, a autenticação (cliente, fluxo e troca de senha), os componentes de interface, a pesquisa pública e a manifestação, o dashboard, a Ouvidoria, setores, escalas, pesquisas, usuários e auditoria. A E2E não foi executada nesta verificação (exige a API e o MySQL locais).

Situação verificada em 07/11/2026 (branch `feature/identidade-visual-vermelha-figma`): lint, typecheck e build aprovados; `npx vitest run --maxWorkers=2` → 18 arquivos, 119 testes aprovados; plugin do Figma → tipos e 5 testes aprovados. `npm run format:check` acusa somente `vercel.json`, que já estava fora do padrão antes desta etapa. A E2E não foi executada: o `.env` local da API aponta o banco para um servidor remoto e não há `TEST_DB_HOST` local (a E2E nunca deve usar serviços remotos). Detalhes em [`docs/relatorios/`](docs/relatorios/).

Este repositório **não tem CI configurada** (não há `.github/workflows`). Rode `npm run check` antes de publicar.

### Testes ponta a ponta (E2E)

A E2E sobe a API com o comando `npm run dev:no-watch` dela (porta 3334, banco de **teste**) e o frontend (porta 5174, com `VITE_API_URL=http://localhost:3334`, passando pelo CORS) e cria/exclui contas fictícias por meio do comando `npm run e2e:fixture` da API. O frontend não importa código da API: só executa os comandos publicados por ela. Usa o Chrome instalado (`channel: 'chrome'`) em dois tamanhos: computador (1440 px) e celular (360 px; somente os fluxos que não gravam dados administrativos).

1. Tenha um clone do repositório da API, com banco local preparado e `.env` com as variáveis do banco de **teste** (`TEST_DB_*`) e `JWT_SECRET`, conforme o README da API. A configuração da E2E passa à API o banco de teste (`DB_*` a partir de `TEST_DB_*`), o mesmo usado pelo `npm run e2e:fixture`.
2. Aqui: defina `FHDOD_API_DIR` com o caminho desse clone e rode `npm run test:e2e`.

| Variável           | Padrão                    | Uso                                                                                                                                                                                                                                      |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FHDOD_API_DIR`    | `..` (pasta acima)        | pasta do projeto da API, relativa à raiz deste repositório ou absoluta. O padrão vem da época em que o frontend ficava dentro do repositório da API; agora que o repositório é separado, **defina esta variável** (ex.: `../fhdod-api`). |
| `E2E_EVIDENCE_DIR` | `test-results/evidencias` | onde salvar as capturas de tela (dados fictícios). Para atualizar as evidências versionadas no repositório da API, aponte para a pasta `docs/evidencias` do clone da API.                                                                |

Cenários cobertos (`e2e/`): autenticação (credenciais inválidas, redirecionamento sem sessão, logout com limpeza, perfil Visualizador sem acesso a Usuários/Auditoria); pesquisa pública (abertura sem login nem cookies, 404/410, layouts de 360 a 1440 px, recarga mantém respostas, conclusão e inatividade apagam os dados); manifestação anônima com protocolo e contato com aceite; Ouvidoria (status, nota, contato auditado e eliminação); painel atualizando com nova resposta e exportação .xlsx; administração (cadastro, troca obrigatória, desativação, redefinição e auditoria); equipe, importação de escala, pesquisa publicada e QR Code decodificado.

## Build de produção

```bash
VITE_APP_ENV=production VITE_API_URL=https://api.exemplo npm run build   # gera dist/
npm run preview                                                           # serve o build em http://localhost:4173
```

O build (`tsc -b && vite build`) gera arquivos estáticos em `dist/`. As variáveis `VITE_*` são fixadas no momento do build. Com `VITE_APP_ENV=production`, `VITE_API_URL` precisa usar `https://`: a validação de `src/lib/env.ts` roda quando a aplicação carrega no navegador (não durante o build) e interrompe o carregamento com erro se a regra não for cumprida. Rotas como `/admin/...` e `/p/<slug>` exigem que a hospedagem devolva `index.html` para caminhos desconhecidos (fallback de SPA).

## Publicação na Vercel

A aplicação está publicada em <https://fhdod-frontend.vercel.app>.

- **Build:** `npm run build`, saída `dist/` (padrão do Vite). As configurações do projeto no painel da Vercel não estão versionadas e não foram conferidas; o repositório só define `vercel.json`.
- **Fallback de SPA:** `vercel.json` reescreve qualquer caminho para `/index.html`, para que rotas como `/login`, `/painel` e `/p/<slug>` funcionem ao abrir o link diretamente ou recarregar a página (commit `7c56ca6`). Verificado: `/`, `/login`, `/painel` e `/p/<slug>` respondem 200 na publicação.
- **Variáveis de ambiente (painel da Vercel):** `VITE_API_URL` com o endereço HTTPS da API, sem `/api/v1` (o build publicado usa `https://fhdod-experiencia-paciente.onrender.com`), e `VITE_APP_ENV=production`. São valores públicos; nenhum segredo é necessário no frontend. Como são fixadas no build, alterar uma variável exige uma nova implantação.
  - **Atenção:** o build publicado verificado em 05/11/2026 contém `VITE_APP_ENV=development` (a variável não está definida como `production` na Vercel ou foi definida com outro valor). A aplicação funciona, mas a exigência de HTTPS para `VITE_API_URL` não é aplicada. Recomenda-se definir `VITE_APP_ENV=production` no ambiente de produção da Vercel e reimplantar.
- **Na API:** o endereço `https://fhdod-frontend.vercel.app` precisa estar em `CORS_ORIGIN` (verificado: a API responde com `Access-Control-Allow-Origin` para essa origem) e em `PUBLIC_APP_URL` (links e QR Code das pesquisas).
- A API publicada pode demorar na primeira requisição depois de um período parado (foi observada uma partida a frio durante a verificação); a página inicial mostra a situação da API e a pesquisa pública tem o botão "Tentar novamente".

## Histórico relevante

- `c293d71` — o frontend passou a ser um projeto independente (antes era a pasta `frontend/` do repositório da API).
- `1587f99` — o **Supabase Auth foi substituído** pela autenticação da própria API (`/auth/login`, `/auth/refresh`, `/auth/logout`); o pacote `@supabase/supabase-js`, `src/lib/supabase.ts` e as variáveis `VITE_SUPABASE_*` foram removidos.
- `7c56ca6` — `vercel.json` com o fallback de rotas da SPA.
- Branch `feature/identidade-visual-vermelha-figma` (novembro de 2026, ainda sem commit) — identidade branco e vermelho e plugin do Figma ([relatório](docs/relatorios/2026-11-07-identidade-visual-vermelha-figma.md)).

## Limitações e pendências

- **TV Wall:** não implementada no frontend (sem rota, página ou componente).
- **Página inicial:** o texto "Estado do desenvolvimento" está desatualizado e não há link para `/login` (o acesso administrativo é feito digitando `/login`).
- **Publicação com `VITE_APP_ENV=development`** (veja [Publicação na Vercel](#publicação-na-vercel)).
- **Sem CI** neste repositório.
- **Cor institucional** `#c8102e` a confirmar com a FHDOD (veja [Identidade visual](#identidade-visual)).
- **Figma:** o plugin em `figma-plugin/` ainda precisa ser executado manualmente no Figma Desktop para aplicar a nova identidade ao arquivo de design.
- **E2E** depende de um clone local da API, do MySQL e do Chrome instalado; não roda contra a publicação.
