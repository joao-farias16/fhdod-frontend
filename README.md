# FHDOD — Interface web (frontend)

Interface web do **FHDOD — Sistema de Gestão da Experiência do Paciente** (Fundação Hospitalar Dr. Oswaldo Diesel): pesquisa pública por QR Code ou link, manifestação, área administrativa (usuários, auditoria, setores, escalas, pesquisas), Ouvidoria, painéis com NPS e relatórios Excel.

Este é um **projeto independente**. Ele tem as próprias dependências, lockfile, configurações (TypeScript, Vite, Vitest, ESLint, Prettier, Playwright) e variáveis de ambiente, e **não usa nenhum arquivo fora desta pasta**: pode ser copiado para outro repositório e continuar funcionando. A comunicação com a API REST do FHDOD acontece **somente por HTTP** (endpoints `/api/v1`), no endereço configurado em `VITE_API_URL`.

> **Ambiente acadêmico.** Projeto integrado do curso Técnico em Informática da ETE Monteiro Lobato – CIMOL. Usa somente dados fictícios.

## Tecnologias

| Camada    | Tecnologias                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface | React 19.3, TypeScript 5.9 (strict), Vite 8, Tailwind CSS 4.3, React Router 8, TanStack Query 5, React Hook Form 7, Lucide React, qrcode.react 4      |
| Sessão    | supabase-js 2 (Supabase Auth, somente com a chave **publicável**)                                                                                     |
| Qualidade | Vitest 5, React Testing Library, jsdom, Playwright 1.63 (E2E), jsqr, ESLint 10 + typescript-eslint, Prettier 3 (com ordenação de classes do Tailwind) |

## Pré-requisitos

- **Node.js 24 LTS** (versão em `.nvmrc`; também verificado com Node 22.12+) e **npm 10+**.
- A **API do FHDOD** em execução para usar o sistema (localmente em `http://localhost:3333`).
- Para o login administrativo: o Supabase Auth (localmente, iniciado no projeto da API com `npm run db:start`).

## Estrutura

```text
frontend/
├── src/
│   ├── main.tsx                 ponto de entrada
│   ├── app/                     provedores, rotas, layouts (público e administrativo) e página 404
│   ├── components/ui/           componentes reutilizáveis (botão, campos, diálogos, estados, etiqueta)
│   ├── features/<domínio>/      páginas, componentes da área e <domínio>-api.ts (tipos e hooks)
│   ├── lib/                     env (variáveis VITE_*), api-client (cliente HTTP único), supabase,
│   │                            formatação pt-BR e erros de formulário
│   ├── styles/                  Tailwind e tokens visuais
│   └── test/                    setup do Vitest e helpers dos testes de componentes
├── e2e/                         testes ponta a ponta (Playwright) e environment.ts (portas e pastas)
├── public/                      arquivos estáticos
├── index.html
├── package.json · package-lock.json
├── tsconfig.json · tsconfig.base.json · tsconfig.app.json · tsconfig.node.json
├── vite.config.ts               Vite, proxy opcional de desenvolvimento e Vitest
├── playwright.config.ts · eslint.config.js · .prettierrc.json · .editorconfig · .nvmrc
├── .env.example · .gitignore
└── README.md
```

`dist/`, `coverage/`, `playwright-report/`, `test-results/` e `playwright/.cache/` são gerados e não versionados.

## Instalação

```bash
cd frontend          # ou a raiz do repositório próprio do frontend, depois da extração
npm ci               # instala somente as dependências do frontend (package-lock.json desta pasta)
cp .env.example .env
```

## Variáveis de ambiente

Arquivo `.env` **nesta pasta** (copiado de `.env.example`). Tudo que começa com `VITE_` é incluído no JavaScript enviado ao navegador: **nunca coloque segredos ou credenciais privadas aqui**.

| Variável                        | Uso                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                  | endereço da API, **sem** `/api/v1` (o cliente HTTP acrescenta o prefixo). Desenvolvimento: `http://localhost:3333`. Produção: `https://…` (obrigatório). Veja abaixo. |
| `VITE_APP_ENV`                  | `development`, `test` ou `production`                                                                                                                                 |
| `VITE_SUPABASE_URL`             | URL do Supabase Auth (local: `http://127.0.0.1:54321`; produção: `https://<projeto>.supabase.co`)                                                                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave **publicável** do Supabase (a chave secreta é recusada pela interface)                                                                                          |

As variáveis são lidas e validadas em um único lugar, [`src/lib/env.ts`](src/lib/env.ts); todas as requisições à API passam pelo cliente HTTP de [`src/lib/api-client.ts`](src/lib/api-client.ts). Não há URLs da API espalhadas pelo código.

### URL da API

- **Padrão (recomendado):** `VITE_API_URL=http://localhost:3333`. O navegador chama a API diretamente; a API precisa liberar a origem do frontend no CORS (variável `CORS_ORIGIN` da API, que localmente já inclui `http://localhost:5173`). É o mesmo modo usado na publicação, com o frontend e a API em endereços diferentes.
- **Mesma origem:** com `VITE_API_URL` vazia, as chamadas vão para `/api/v1` no próprio endereço da página. Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:3333` (proxy apenas de desenvolvimento; outro destino com `VITE_PROXY_TARGET`). Em produção, isso exige um proxy reverso que encaminhe `/api` para a API.

Na publicação, cadastre o endereço público do frontend em `CORS_ORIGIN` e em `PUBLIC_APP_URL` da API (links e QR Code das pesquisas).

## Execução

Com a API rodando em outro terminal (no projeto da API: `npm run dev`):

```bash
npm run dev          # http://localhost:5173
```

A página inicial mostra "API disponível" quando a comunicação com a API está funcionando.

## Testes e qualidade

| Comando                 | O que faz                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run check`         | formatação, lint, typecheck, testes e build, em sequência (igual ao job do frontend na CI) |
| `npm run typecheck`     | TypeScript (`tsc -b`: aplicação, configurações e E2E)                                      |
| `npm run lint`          | ESLint sem avisos tolerados; `npm run lint:fix` corrige                                    |
| `npm run format:check`  | Prettier; `npm run format` corrige                                                         |
| `npm test`              | testes de componentes e unidade (Vitest + jsdom); não precisam da API nem do `.env`        |
| `npm run test:coverage` | cobertura                                                                                  |
| `npm run test:e2e`      | ponta a ponta com Playwright, Chrome instalado, API e Supabase Auth locais (veja abaixo)   |

Se o Vitest acusar `Timeout waiting for worker to respond` em máquina sobrecarregada, use `npx vitest run --maxWorkers=2`.

### Testes ponta a ponta (E2E)

A E2E sobe a API com o comando `npm run dev:no-watch` dela (porta 3334, banco de **teste**) e o frontend (porta 5174, com `VITE_API_URL=http://localhost:3334`, passando pelo CORS) e cria/exclui contas fictícias por meio do comando `npm run e2e:fixture` da API. O frontend não importa código da API: só executa os comandos publicados por ela.

1. No projeto da API: `npm run db:start` e `.env` com `TEST_DATABASE_URL`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` locais.
2. Aqui: `npm run test:e2e`.

| Variável           | Padrão                    | Uso                                                                                                                                |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `FHDOD_API_DIR`    | `..` (pasta acima)        | pasta do projeto da API, relativa a esta pasta ou absoluta. Depois da extração para outro repositório, aponte para o clone da API. |
| `E2E_EVIDENCE_DIR` | `test-results/evidencias` | onde salvar as capturas de tela (dados fictícios). Para atualizar as evidências versionadas da API: `../docs/evidencias`.          |

## Build de produção

```bash
VITE_APP_ENV=production VITE_API_URL=https://api.exemplo npm run build   # gera dist/
npm run preview                                                           # serve o build em http://localhost:4173
```

O conteúdo de `dist/` é estático e pode ser publicado em qualquer hospedagem de sites estáticos. As variáveis `VITE_*` são fixadas no momento do build. Rotas como `/admin/...` e `/p/<slug>` exigem que a hospedagem devolva `index.html` para caminhos desconhecidos (fallback de SPA).

## Extração para outro repositório

1. Copie o conteúdo desta pasta para a raiz do novo repositório.
2. `npm ci`, `cp .env.example .env` e ajuste `VITE_API_URL`.
3. Para a E2E, defina `FHDOD_API_DIR` com o caminho do clone da API.
4. Copie o job `frontend` de `.github/workflows/ci.yml` da API, retirando `working-directory: frontend` e `cache-dependency-path`.
