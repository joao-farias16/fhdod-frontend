# Componentes compartilhados, responsividade e acessibilidade

Documento técnico do frontend FHDOD. Descreve o que **existe no código** em `src/components/ui/`,
nos layouts de `src/app/` e em `src/styles/index.css`. Rotas e telas: [`inventario-de-telas.md`](inventario-de-telas.md).
Visão geral e comandos: [`README.md`](../README.md). TV Wall: [`tv-wall.md`](tv-wall.md).

## 1. Componentes de interface (`src/components/ui/`)

| Arquivo             | Exporta                                                                                                                                    | Responsabilidade                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button-classes.ts` | `buttonClasses(variant, className)`, `ButtonVariant`                                                                                       | Classes do botão (`primary`, `secondary`, `danger`, `ghost`), reaproveitadas por links com aparência de botão (página 404, "Entrar no sistema", acesso não permitido). Altura mínima 44 px                                       |
| `Button.tsx`        | `Button`                                                                                                                                   | Botão que usa `buttonClasses`                                                                                                                                                                                                    |
| `Field.tsx`         | `TextField`, `TextAreaField`, `SelectField`, `CheckboxField`, `CONTROL_CLASS`, `TEXTAREA_CLASS`                                            | Rótulo, controle, dica e erro em coluna; marca de obrigatório (`isRequired`: asterisco fora do `<label>` e `aria-required` no controle); erro com ícone e `aria-describedby`; `fieldClassName` para ocupar duas colunas da grade |
| `Page.tsx`          | `PageContainer`, `PageHeader`, `Card`, `CARD_CLASS`, `FilterPanel`                                                                         | Estrutura das telas administrativas (veja a seção 2)                                                                                                                                                                             |
| `Table.tsx`         | `TableContainer`, `TABLE_CLASS`, `THEAD_CLASS`, `TH_CLASS`, `TBODY_CLASS`, `TR_CLASS`, `TD_CLASS`, `TD_ACTIONS_CLASS`, `STACK_TABLE_CLASS` | Estilo único das tabelas e a variante que vira cartões no celular (seção 3)                                                                                                                                                      |
| `States.tsx`        | `Loading`, `ErrorState`, `EmptyState`, `Pagination`                                                                                        | Carregamento (`role="status"`), erro com "Tentar novamente", vazio com ícone e paginação (empilhada no celular)                                                                                                                  |
| `Alert.tsx`         | `Alert`                                                                                                                                    | Avisos informativos, de sucesso e de erro, com o `requestId` quando a API o envia                                                                                                                                                |
| `Dialog.tsx`        | `Dialog`                                                                                                                                   | Diálogo modal                                                                                                                                                                                                                    |
| `ConfirmDialog.tsx` | `ConfirmDialog`                                                                                                                            | Confirmação de ações destrutivas; rodapé com divisória, botões empilhados no celular (ação principal em cima) e lado a lado a partir de 640 px                                                                                   |
| `Tag.tsx`           | `Tag`                                                                                                                                      | Etiquetas de situação (sucesso, informação, neutra e demais tons) com borda, fundo claro e texto escuro                                                                                                                          |

Testes dos componentes: `src/components/ui/ui.test.tsx`.

### Campos e seletores

- Todo controle tem altura mínima de 44 px (RNF05), borda `neutral-border` (#6B7280, contraste 3:1), foco com
  borda e contorno vermelhos de 2 px (RNF07) e estados de erro (`aria-invalid`, borda `danger-700`) e
  desabilitado.
- `SelectField` usa o `<select>` nativo (teclado, leitores de tela e celulares inalterados) com seta própria
  que gira ao abrir. Nos navegadores que aceitam `appearance: base-select`, a lista de opções também segue a
  identidade (classe `fhdod-select` em `src/styles/index.css`, dentro de `@supports`); nos demais, a lista é
  a do sistema.
- `CheckboxField` tem área clicável de 44 px e marca na cor da identidade; `alignWithFields` alinha a caixa
  com os campos vizinhos nas grades de filtros.
- Campos `date` e `time` ficam sempre no tema claro (`color-scheme: light`).

### Botões

| Variante    | Uso                                              | Cores                                            |
| ----------- | ------------------------------------------------ | ------------------------------------------------ |
| `primary`   | ação principal                                   | fundo `brand-700`, texto branco (5,88:1)         |
| `secondary` | ações alternativas, "Tentar novamente", "Limpar" | fundo branco, borda `neutral-border`             |
| `danger`    | ações destrutivas (sempre com confirmação)       | fundo `danger-700`, texto branco (8,31:1)        |
| `ghost`     | ações discretas                                  | texto `brand-700`, fundo claro ao passar o mouse |

## 2. Estrutura das telas administrativas

- **`PageContainer`**: largura máxima de 7xl (`narrow` limita a `max-w-2xl`, usado na troca de senha), margens de
  16 px (24 px a partir de 640 px) e espaçamento vertical uniforme entre blocos.
- **`PageHeader`**: título (`<h1>`), descrição curta, linhas extras (escopo, período) e ações principais à
  direita; no celular as ações vão para baixo do título. Usado em Painel geral e por setor, Manifestações
  (lista e detalhe), Relatórios, Usuários, Auditoria, Setores, Escalas, Importação de escalas e Pesquisas
  (lista e editor).
- **`Card`**: cartão branco com borda e sombra leves, título (`<h2>` ligado por `aria-labelledby`), descrição e
  ações opcionais.
- **`FilterPanel`**: formulário de filtros (`role="search"`) em cartão, com grade de 2 colunas a partir de
  640 px e de 3, 4 ou 5 colunas a partir de 1024 px (`columns`); barra inferior separada por uma linha, com
  opções à esquerda e botões à direita. No celular, os botões ocupam a largura toda e a ação principal fica
  em cima. Usado em Painel (`DashboardFiltersForm`), Manifestações, Usuários, Auditoria, Escalas e Pesquisas.
  Relatórios usa `Card`, `CheckboxField` e `SelectField` diretamente.

## 3. Tabelas e adaptação para cartões

`TableContainer` envolve a tabela em um cartão com rolagem horizontal **dentro** do próprio cartão (região
focável, com nome acessível), nunca na página. O estilo (cabeçalho cinza, linhas separadas, hover) vem das
constantes de `Table.tsx`.

Quatro listagens usam também `STACK_TABLE_CLASS` (`table-stack`): **Manifestações**, **Usuários**, **Auditoria**
e **Setores**. Abaixo de 768 px (`@media (max-width: 767.98px)` em `src/styles/index.css`):

- cada linha vira um cartão em bloco, sem rolagem lateral;
- cada célula com `data-label` mostra o nome da coluna (via `::before`, `attr(data-label)`) à esquerda do valor;
- a primeira célula, sem `data-label`, funciona como título do cartão;
- a célula marcada com `data-actions` vai ao pé do cartão, com uma linha divisória;
- o `<thead>` continua no DOM, apenas oculto visualmente (leitores de tela mantêm as colunas).

As demais tabelas (grupos do painel e do painel por setor, importação de escalas) mantêm a rolagem horizontal
dentro do cartão. No painel, `GroupTable` oculta algumas colunas abaixo de 640 px.

## 4. Layouts e navegação

| Layout                      | Onde                             | Cabeçalho                                                                                  |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `AppLayout` (`src/app/`)    | `/`, `/p/:slug`, 404             | vermelho (`brand-700`), logotipo oficial, legenda a partir de 640 px; rodapé institucional |
| Login (`LoginPage`)         | `/login`                         | vermelho, logotipo e "Área administrativa"; cartão central                                 |
| `AdminLayout` (`src/app/`)  | rotas administrativas protegidas | barra vermelha + barra de navegação clara (veja abaixo)                                    |
| Cartaz (`SurveyPosterPage`) | `/admin/pesquisas/:id/cartaz`    | sem layout, para impressão                                                                 |
| `TvWallPage`                | `/tv`                            | próprio; único link "Voltar à página principal" (`/painel`)                                |

**Cabeçalho administrativo.** Primeira faixa: logotipo (`/images/logo-fhdod-oficial.png`, 245 × 102, altura de
36 px no celular, 44 px a partir de 430 px e 48 px a partir de 640 px; leva à tela inicial do perfil), usuário
(nome e perfil), "Trocar senha" e "Sair". Abaixo de 640 px o usuário ocupa uma linha própria e "Trocar senha"
mostra só o ícone (o texto fica disponível a leitores de tela); logotipo, ações e botão "Menu" ficam alinhados
na primeira linha. Segunda faixa: navegação com ícones (Lucide) e item ativo destacado (`NavLink`). A partir de
1024 px é uma barra horizontal com borda inferior vermelha no item ativo; abaixo, o botão "Menu"
(`aria-expanded`/`aria-controls`) abre a lista em coluna, que fecha ao escolher um item. Itens (permissão):
Painel (`dashboard:read`), Ouvidoria (`manifestations:read`), Relatórios (qualquer `reports:*`), Pesquisas
(`surveys:read`), Setores e equipes (`teams:create`), Escalas (`shifts:read`), Usuários (`users:read`),
Auditoria (`audit_logs:read`) e TV Wall (`/tv`, sem permissão). Com troca de senha obrigatória, a navegação
fica vazia.

O link "Pular para o conteúdo" existe em todos os layouts (`#conteudo`, com `tabIndex={-1}` no `<main>`).

## 5. Identidade visual

Tokens (`@theme` em `src/styles/index.css`): `brand-50/100/700/800`, `danger-700/800`, `info-50/700/800/950`,
`neutral-border` e a escala de texto da TV (`text-tv-hero`, `-number`, `-label`, `-small`). Valores, usos e
contrastes: tabela da seção "Identidade visual" do [`README.md`](../README.md). O logotipo oficial é o arquivo
`public/images/logo-fhdod-oficial.png`, usado em `AppLayout`, `AdminLayout`, `LoginPage` e `TvWallPage`, sempre
com `alt="FHDOD"`. O `public/favicon.svg` continua sendo o ícone da aba.

## 6. Responsividade

Pontos de quebra do Tailwind: `sm` 640 px, `md` 768 px, `lg` 1024 px e a variante própria `tv:` (tela de pelo
menos 1600 × 1000 px). Resumo do comportamento implementado:

| Largura       | Comportamento                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| < 640 px      | filtros em uma coluna, botões de filtro e de rodapé de diálogo em largura total, usuário do cabeçalho em linha própria, ações do título abaixo |
| < 768 px      | tabelas de Manifestações, Usuários, Auditoria e Setores viram cartões                                                                          |
| < 1024 px     | menu administrativo recolhido no botão "Menu"; TV Wall em uma coluna                                                                           |
| ≥ 1600 × 1000 | escala de TV (160/64/32/24 px) na TV Wall                                                                                                      |

Os testes E2E verificam a ausência de rolagem horizontal da página na pesquisa pública (360, 390, 820 e 1440 px), no
formulário de manifestação (360 px) e na TV Wall (360, 1440 e 1920 × 1080); a verificação de acessibilidade
(axe), que percorre também as telas administrativas, roda nos tamanhos dos projetos de navegador. Veja a seção de testes do README.

## 7. Acessibilidade

- Contraste e alvos: texto e controles com contraste mínimo conforme a tabela de identidade; alvos de toque de
  44 px (RNF05), verificados pelo E2E (T39).
- Foco visível de 2 px em vermelho (branco dentro do cabeçalho vermelho).
- O significado nunca depende só da cor: erros e avisos têm ícone e texto (RNF08).
- Formulários: rótulo associado, `aria-required`, `aria-invalid`, `aria-describedby` para dica e erro.
- Regiões rolantes (tabelas) são focáveis e nomeadas; paginação em `<nav aria-label="Paginação">`.
- Verificação automática: `@axe-core/playwright` (WCAG 2.0/2.1/2.2 A e AA) em todas as telas, em
  `e2e/acessibilidade.spec.ts`. Leitor de tela e demais testes manuais continuam pendentes (README).
