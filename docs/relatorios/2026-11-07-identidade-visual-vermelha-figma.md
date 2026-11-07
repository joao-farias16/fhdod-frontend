# Relatório técnico — Identidade visual branco e vermelho e plugin do Figma

- **Data:** 07/11/2026
- **Repositório:** `fhdod-frontend` (somente o frontend; o backend não foi alterado)
- **Branch:** `feature/identidade-visual-vermelha-figma`
- **Situação:** implementado e verificado localmente; **sem commit, push ou Pull Request**

## 1. Resumo

A identidade visual do frontend passou de branco e azul para **branco e vermelho**, seguindo a
Fundação Hospitalar Dr. Oswaldo Diesel. A mudança foi feita nos **tokens centralizados** do
Tailwind (`src/styles/index.css`) e em poucos pontos com cor própria (texto secundário do
cabeçalho, avisos/etiquetas informativos, linha do gráfico, favicon e `theme-color`). Layouts,
tipografia, espaçamentos, textos e funcionalidades não mudaram.

As cores semânticas foram tratadas à parte: **erro/perigo** passou a um vermelho-escuro distinto
do vermelho da marca, **informação** continua azul (para não parecer erro), **sucesso** (verde) e
**aviso** (âmbar) não mudaram.

Foi criado o plugin **FHDOD — Identidade visual** (`figma-plugin/`) para o Figma Desktop. Ele
analisa o arquivo `sistema-hospital`, troca os valores das variáveis de cor, religa os
componentes informativos, troca cores fixas antigas, preserva imagens/ícones/QR Code/logotipos e
cria — sem duplicar — as telas do frontend ausentes no Figma (três diálogos da Gestão de
usuários). O plugin foi verificado por tipos e testes automatizados, mas **ainda não foi executado
no Figma Desktop** (depende de execução manual).

## 2. Git

| Item                     | Situação                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Branch de origem (local) | `main` (árvore limpa, sem alterações locais preexistentes)                                                  |
| Base da nova branch      | `origin/develop` (`57fd166`; após `git fetch --all --prune`, `develop` e `main` apontavam para o mesmo SHA) |
| Branch criada (local)    | `feature/identidade-visual-vermelha-figma`, criada com `git checkout -b … origin/develop --no-track`        |
| Branch criada (remota)   | `feature/identidade-visual-vermelha-figma`, criada pela API do GitHub apontando para `57fd166` (sem push)   |
| `main` e `develop`       | não alteradas (local e remoto continuam em `57fd166`)                                                       |
| Commits / push / PR      | **nenhum**                                                                                                  |
| Estado final             | 12 arquivos modificados e 2 pastas novas (`figma-plugin/`, `docs/relatorios/`), tudo não versionado         |

A branch remota foi criada vazia (mesmo SHA de `develop`): o conteúdo só chega a ela quando o
responsável fizer commit e push.

## 3. Frontend

### Análise

- **Rotas** (`src/app/routes.tsx`): `/`, `/p/:slug`, `/login`, `/trocar-senha`, `/painel`,
  `/painel/setores/:sectorId`, `/ouvidoria/manifestacoes`, `/ouvidoria/manifestacoes/:id`,
  `/relatorios`, `/admin/usuarios`, `/admin/auditoria`, `/admin/setores`, `/admin/turnos`,
  `/admin/escalas/importar`, `/admin/pesquisas`, `/admin/pesquisas/:id`,
  `/admin/pesquisas/:id/cartaz`, 404 e o estado "Acesso não permitido".
- **Layouts:** `AppLayout` (público) e `AdminLayout` (menu por permissão, menu recolhível abaixo de
  768 px); o login tem cabeçalho próprio.
- **Componentes reutilizáveis** (`src/components/ui/`): `Button` (primário, secundário, perigo,
  fantasma), `Alert` (erro, sucesso, informação), `Tag`, `Field` (texto e seleção), `Dialog`,
  `ConfirmDialog`, `States` (carregamento, erro, vazio, paginação).
- **Gráficos e indicadores:** `DashboardWidgets` (barras em `bg-brand-700`, linha de tendência em
  SVG com cor fixa), cartões de indicador; escala de nota da pesquisa pública (`ScoreScale`),
  barra de progresso (`SurveyFlow`).
- **Onde estavam as cores:** tokens `brand-50/700/800`, `danger-700` e `neutral-border` no `@theme`
  de `src/styles/index.css` (fonte única das classes `*-brand-*`), além de
  `text-blue-100` (3 cabeçalhos), `text-blue-950` (aviso informativo), `hover:bg-red-800` (botão de
  perigo), hex `#1d4ed8` no SVG do gráfico, no `favicon.svg` e no `theme-color`. Não há biblioteca
  de componentes nem tema de terceiros.

### Arquivos modificados

| Arquivo                                       | Alteração                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/index.css`                        | tokens `brand-*` vermelhos (+ `brand-100`), `danger-700/800`, novos `info-50/700/800/950`; foco branco dentro do cabeçalho |
| `src/components/ui/Button.tsx`                | hover do perigo pelo token `danger-800`; comentário da Tabela 22 com os novos valores e contrastes                         |
| `src/components/ui/Alert.tsx`                 | aviso informativo usa `info-*` (continua azul)                                                                             |
| `src/components/ui/Tag.tsx`                   | etiqueta "info" usa `info-*` (continua azul)                                                                               |
| `src/app/AppLayout.tsx`                       | subtítulo do cabeçalho `text-blue-100` → `text-brand-100`                                                                  |
| `src/app/AdminLayout.tsx`                     | perfil do usuário no cabeçalho `text-blue-100` → `text-brand-100`                                                          |
| `src/features/auth/LoginPage.tsx`             | "Área administrativa" `text-blue-100` → `text-brand-100`                                                                   |
| `src/features/dashboard/DashboardWidgets.tsx` | linha e pontos da tendência `#1d4ed8` → `#c8102e`                                                                          |
| `public/favicon.svg`                          | fundo do ícone vermelho                                                                                                    |
| `index.html`                                  | `theme-color` vermelho                                                                                                     |
| `eslint.config.js`                            | bloco para `figma-plugin/**/*.js` (globais `figma`/`__html__`, sem verificação por projeto TS)                             |
| `README.md`                                   | seção "Identidade visual", estrutura, plugin, situação dos testes, limitações                                              |

### Paleta e contraste (calculado pela fórmula WCAG 2.1)

| Token        | Antes     | Depois    | Contraste                              |
| ------------ | --------- | --------- | -------------------------------------- |
| `brand-700`  | `#1d4ed8` | `#c8102e` | 5,88:1 com branco (AA)                 |
| `brand-800`  | `#1e40af` | `#a50d26` | 7,82:1 com branco (AAA)                |
| `brand-50`   | `#eff6ff` | `#fdf2f4` | brand-700 sobre ele: 5,37:1            |
| `brand-100`  | —         | `#fde4e7` | sobre brand-700: 4,88:1 (AA)           |
| `danger-700` | `#b91c1c` | `#991b1b` | 8,31:1 com branco; 7,60:1 sobre red-50 |
| `danger-800` | (red-800) | `#7f1d1d` | 10,02:1 com branco                     |
| `info-*`     | (= brand) | azul      | info-700 sobre info-50: 6,16:1         |

### Componentes e páginas afetados

Por usarem os tokens, todas as telas mudam juntas: cabeçalhos (público, login e administrativo),
item ativo do menu, botões primários e de perigo, links, seleção da escala de nota, opções
marcadas da manifestação, barra de progresso da pesquisa, oferta de manifestação, linha
selecionada de setores, barras e linha do painel, títulos de destaque (início, cartaz),
foco visível. Nenhuma página, rota, texto ou comportamento foi alterado.

### Problemas encontrados e corrigidos

- **Informação × erro:** o aviso e a etiqueta "info" usavam o token da marca; com a marca vermelha
  ficariam iguais a erro. Criados os tokens `info-*` (azul).
- **Perigo × marca:** `danger-700` (`#b91c1c`) ficaria quase igual ao novo vermelho da marca.
  Passou a `#991b1b`, mais escuro e com contraste maior.
- **Foco no cabeçalho:** o contorno de foco da cor da marca já era invisível sobre o cabeçalho da
  mesma cor (azul sobre azul). Agora é branco dentro de `header` (RNF07).

## 4. Plugin Figma

### Arquivos criados

| Arquivo                                | Conteúdo                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `figma-plugin/manifest.json`           | `editorType: ["figma"]`, `documentAccess: "dynamic-page"`, sem rede                  |
| `figma-plugin/code.js`                 | lógica (sandbox): análise, variáveis, religação, cores fixas, criação de telas       |
| `figma-plugin/ui.html`                 | interface: identificação, etapas, progresso, resumo, telas, ausentes, problemas      |
| `figma-plugin/package.json` + lockfile | scripts `typecheck`, `test`, `check`; dependências só de verificação                 |
| `figma-plugin/tsconfig.json`           | verificação de tipos do JavaScript (`checkJs`, `strict`) com `@figma/plugin-typings` |
| `figma-plugin/test/plugin.test.js`     | 5 testes em Node com uma simulação da Plugin API                                     |
| `figma-plugin/README.md`               | finalidade, estrutura, importação, execução, etapas, resultados e limitações         |

### Tecnologias

JavaScript puro (sem build), Plugin API do Figma 1.0.0, `@figma/plugin-typings` 1.142.0 e
TypeScript 5.9 só para verificação, `node:test` para os testes.

### Funcionamento e recursos

1. **Analisar documento** (somente leitura): carrega cada página (`page.loadAsync()`), percorre
   todos os frames em lotes de 150 camadas, devolvendo o controle ao Figma entre os lotes, e
   mostra variáveis (atual × nova), telas ausentes, pendências por frame e problemas.
2. **Executar atualização**, em etapas selecionáveis, cada uma com `figma.commitUndo()`:
   - **Variáveis:** cria `informação/50…950` (com escopos explícitos) e troca `marca/*` e
     `perigo/700` na coleção `FHDOD — Cores`.
   - **Componentes** (antes das telas, para as instâncias herdarem): religa as variantes
     "info" de Aviso/Etiqueta e suas instâncias para `informação/*`.
   - **Telas:** pinturas sólidas sem variável com as cores azuis antigas passam a usar a
     variável correspondente (`setBoundVariableForPaint`); textos com várias cores são tratados
     por trecho (`getStyledTextSegments`/`setRangeFills`, com fontes carregadas antes).
   - **Telas ausentes:** cria os três diálogos da TL16 sobre uma cópia da tela de usuários,
     usando variáveis, ícones `Ícone/*` e o componente Botão quando encontrado; nunca recria um
     frame com o mesmo nome.
3. **Proteções:** imagens/vídeos, gradientes, sombras, frame **Ícones**, nós cujo nome contém
   logo/ilustração/imagem/foto/QR, variáveis e estilos de biblioteca externa, aliases e textos com
   fonte ausente não são alterados — aparecem como "aviso" ou "revisar".
4. **Cancelamento** entre lotes, **ir até o frame** pelo nome na lista, marca interna nas telas
   atualizadas/criadas.

### Arquivo Figma inspecionado (somente leitura, via Figma MCP)

Uma leitura em 07/11/2026 mostrou: 1 página (`Page 1`); frames **Ícones** (39 ícones) e
**Componentes** (Botão, Campo, Aviso, Etiqueta, Item de menu, Marca FHDOD, Cartão de indicador,
Opção da escala, Caixa de seleção, Opção de rádio, Rodapé, Paginação); 21 frames de tela; coleção
`FHDOD — Cores` (modo "Claro", 20 variáveis, `marca/700 = #1d4ed8`); 12 estilos de texto
`FHDOD/*`; nenhum estilo de cor. A segunda leitura (contagem de pinturas ligadas × fixas) foi
**bloqueada pelo limite de chamadas do plano Starter do Figma MCP** — motivo pelo qual a
atualização é feita pelo plugin.

**Cobertura:** todas as rotas e estados do frontend têm tela no arquivo. Ausentes: os diálogos
**Novo usuário**, **Senha temporária** e **Desativar usuário (confirmação)** da TL16 — criados pelo
plugin. A TL15 (TV Wall) não existe no frontend e não foi criada.

### Limitações da API (verificadas na tipagem oficial)

- `figma.createAutoLayout`, `node.query` e `node.set` **não existem** na API oficial (são
  extensões do Figma MCP); o plugin usa `createFrame()` + `layoutMode`.
- Com `documentAccess: "dynamic-page"`, páginas precisam de `loadAsync()` e as leituras de
  variáveis/estilos/componentes principais são assíncronas (`getLocalVariablesAsync`,
  `getStyleByIdAsync`, `getMainComponentAsync`).
- `clone()` e `createInstance()` colocam o nó em `figma.currentPage`; o plugin move as telas
  criadas para a página da TL16.
- Variáveis e estilos de bibliotecas externas não são editáveis pelo plugin; textos exigem a fonte
  carregada (`loadFontAsync`) antes de qualquer alteração.
- Preenchimentos são listas imutáveis (o plugin monta uma nova lista e a atribui).

### Instalação e utilização

Figma Desktop › **Plugins › Development › Import plugin from manifest…** › `figma-plugin/manifest.json`;
depois **Analisar documento** e **Executar atualização** (detalhes em `figma-plugin/README.md`).

### O que foi efetivamente testado

- `npm run typecheck` (na pasta do plugin): **aprovado** — `code.js` sem erros em modo `strict`
  contra `@figma/plugin-typings` 1.142.0, o que confirma nomes e assinaturas de todas as APIs usadas.
- `npm test`: **5 de 5 aprovados** — funções puras; valores do plugin iguais aos tokens do CSS;
  cobertura das rotas; análise sem alterar nada (21 telas, 3 ausentes, QR Code sinalizado);
  atualização (variáveis, religação "info" no componente e na instância, cores fixas e trechos de
  texto ligados às variáveis, imagem/QR Code/ícones intactos, neutros intactos); criação dos três
  diálogos com os textos do frontend, posicionados sem sobreposição; segunda execução sem duplicar
  nada.
- `manifest.json` validado como JSON; script da interface verificado com `node --check`; `code.js`
  sem `?.`/`??` (compatibilidade com o sandbox).

### O que depende de teste manual no Figma Desktop

- Importar o manifesto e abrir o plugin; executar a análise e a atualização no arquivo real.
- Conferir visualmente as telas atualizadas e os três diálogos criados (alinhamento, quebra de
  texto, instâncias do Botão).
- Conferir se os nomes das variantes de Aviso/Etiqueta contêm "info" (a religação depende disso)
  e revisar a lista "revisar".

## 5. Testes

| Teste                                     | Resultado               | Observações                                                                                                                                                                         |
| ----------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`, projeto inteiro)  | Aprovado                | 0 erros, 0 avisos (inclui `figma-plugin/`)                                                                                                                                          |
| TypeScript (`npm run typecheck`)          | Aprovado                |                                                                                                                                                                                     |
| Vitest (`npm test`, paralelismo padrão)   | 113/119 na 1ª execução  | 6 falhas por _timeout_ de 5 s com a máquina sobrecarregada (jsdom somou 476 s); os 5 arquivos isolados passaram (37/37). O README já documenta o caso                               |
| Vitest (`npx vitest run --maxWorkers=2`)  | **Aprovado — 119/119**  | 18 arquivos; os testes rodam com `css: false`, então não dependem de cores                                                                                                          |
| Build de produção (`npm run build`)       | Aprovado                | `tsc -b && vite build`                                                                                                                                                              |
| Prettier (`npm run format:check`)         | Falha preexistente      | só `vercel.json`, que não foi alterado nesta etapa e já estava fora do padrão em `develop`; todos os arquivos alterados/criados estão formatados. Não corrigido (fora do escopo)    |
| Plugin — tipos e testes (`figma-plugin`)  | Aprovado — 5/5          | ver seção 4                                                                                                                                                                         |
| Verificação no Chrome (build de produção) | **Aprovado — 309/309**  | Playwright + `vite preview`, API interceptada com dados fictícios (detalhes abaixo)                                                                                                 |
| E2E do projeto (`npm run test:e2e`)       | **Não executado**       | o `.env` local da API aponta `DB_HOST` para um MySQL remoto e não há `TEST_DB_HOST` local; a E2E grava contas e nunca deve usar serviços remotos. A tentativa parou antes de gravar |
| Verificação de dependências               | Sem mudança no frontend | nenhuma dependência do frontend foi adicionada/alterada; o plugin tem só dependências de verificação, isoladas na pasta dele                                                        |
| Execução do plugin no Figma Desktop       | **Pendente (manual)**   |                                                                                                                                                                                     |

**Verificação no Chrome (roteiro fora do repositório).** Build de produção servido por
`vite preview`; a API foi interceptada no navegador (login, `/me` com todas as permissões,
`/health`, listas vazias, 404 em painéis/detalhes e na pesquisa pública). Em cada viewport:

- 18 rotas (4 públicas + 14 administrativas): sem rolagem horizontal, sem erro de JavaScript no
  console, cabeçalho em `rgb(200, 16, 46)` e nenhum elemento com o azul antigo (`#1d4ed8`/`#1e40af`);
- login com senha errada mostra o aviso e permanece em `/login`; login válido leva o
  Superadministrador a `/admin/usuarios`;
- menu: em 360 px o botão **Menu** abre a navegação e o link leva à tela; em 768 px ou mais, o
  item ativo fica com texto `#a50d26` sobre branco;
- diálogo **Novo usuário** abre, cabe na tela, tem botão primário vermelho e fecha com Esc;
- **Sair** encerra a sessão e volta ao login.

Limite desta verificação: com respostas vazias/404, os painéis, detalhes e a pesquisa pública
foram vistos nos estados vazio/erro; os estados com dados continuam cobertos pelos testes de
componentes (Vitest), não por esta verificação visual.

## 6. Responsividade

| Dispositivo | Resolução  | Verificações | Resultado                                                                    |
| ----------- | ---------- | ------------ | ---------------------------------------------------------------------------- |
| Computador  | 1440 × 900 | 77           | Aprovado: sem estouro horizontal, menu completo, diálogo centralizado        |
| Notebook    | 1280 × 800 | 77           | Aprovado                                                                     |
| Tablet      | 768 × 1024 | 77           | Aprovado (toque; menu horizontal a partir de 768 px, como antes)             |
| Celular     | 360 × 800  | 78           | Aprovado: menu recolhível funcionando, diálogo em largura total, sem estouro |

Capturas foram feitas só para conferência e ficaram fora do repositório (não há PNG novo no
projeto). Textos cortados e sobreposições foram conferidos visualmente nas capturas de 1440 px
(diálogo) e 360 px (início).

## 7. Documentação

- `README.md` — atualizado (identidade visual, estrutura, plugin, qualidade, histórico, limitações).
- `figma-plugin/README.md` — criado (documentação completa do plugin).
- `docs/relatorios/2026-11-07-identidade-visual-vermelha-figma.md` — este relatório (criado; não
  havia relatórios anteriores neste repositório).

## 8. GitHub Projects

Projeto **FHDOD — Gestão da Experiência do Paciente** (`joao-farias16`, nº 1):

- Não havia item para esta etapa. Foi criado **um** item (rascunho do Project, sem abrir issue
  em repositório): **"Identidade visual branco e vermelho e plugin do Figma (frontend)"**, com
  descrição, checklist (itens concluídos e pendentes), **Status: Em revisão** (mesmo padrão do
  item "Etapa 1": trabalho pronto, aguardando commit/PR do responsável) e **Responsável: João**.
  O campo Etapa (ET01–ET14, do cronograma antigo) ficou vazio, como no item "Etapa 1".
- Nenhum outro item foi alterado (31 itens no total após a criação).

## 9. Pendências e riscos

1. **Executar o plugin no Figma Desktop** e conferir o resultado (não foi possível testar dentro do
   Figma por aqui; o MCP atingiu o limite do plano Starter).
2. **Cor institucional:** nenhum manual de marca da FHDOD foi encontrado em fonte pública;
   `#c8102e` é uma escolha técnica (contraste AA) a confirmar com a instituição.
3. **E2E** não executada: falta banco de teste local (`TEST_DB_HOST`) — o `.env` da API aponta
   para um servidor remoto. Recomenda-se configurar `TEST_DB_*` locais antes de rodar.
4. **Vermelho de erro × vermelho da marca:** são tons distintos e o significado nunca depende só
   da cor, mas a distinção é menor que no esquema azul. Vale uma revisão de usabilidade.
5. **Religação "info" no Figma** depende dos nomes das variantes; avisos azuis montados à mão
   ficam vermelhos (aparecem na análise para revisão).
6. `vercel.json` fora do padrão do Prettier (preexistente; faz `npm run check` parar na 1ª etapa).
7. Commit, push e Pull Request da branch (responsável).

## 10. Conclusão

A parte de código está **concluída e verificada**: identidade branco e vermelho aplicada aos
tokens e componentes, cores semânticas preservadas, lint/typecheck/build aprovados, 119/119 testes
de componentes e 309/309 verificações no navegador em quatro tamanhos de tela, sem regressões
funcionais encontradas. O plugin do Figma está implementado e verificado por tipos e testes.

A etapa **ainda depende de validações adicionais** para ser considerada encerrada: a execução do
plugin no Figma Desktop (com a conferência das telas), a confirmação da cor institucional e a E2E
com banco de teste local — além da revisão, commit e Pull Request pelo responsável.
