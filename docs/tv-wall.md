# TV Wall — TL15 (`/tv`, ET10)

Tela pública para TV com os indicadores agregados de satisfação do hospital (RF68–RF72, RN09,
RN21; Tabela 21: "NPS geral, contagens, tendência, setores e convite"). Contrato do endpoint no
repositório da API: `docs/tv-wall.md` (E42).

## Acesso e isolamento (RF72)

| Item            | Implementação                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rota            | `/tv` (opcional: `/tv?periodo=7d`, `30d` ou `90d`; padrão e qualquer outro valor: `30d`)                                                                                                 |
| Layout          | rota própria, **fora** do layout público e do administrativo: sem menu, sem cabeçalho com links, sem rodapé administrativo. A página não tem nenhum link, botão, formulário ou campo     |
| Código          | `src/features/tv-wall/` carregado sob demanda em pedaço próprio (`TvWallPage-*.js`), sem o cliente de autenticação, a sessão ou qualquer tela administrativa                             |
| Dados           | **somente** o E42 — `GET /api/v1/tv-wall/summary?period=…`, pelo `apiGet` de `src/lib/api-client.ts`, sem `Authorization` e sem cookies. Nenhum acesso a banco ou a serviço de terceiros |
| Lista de campos | `fetchTvWallSummary` confere a forma da resposta (`isTvWallSummary`) e copia apenas os campos do contrato (`pickAllowedFields`); campos extras nunca chegam aos componentes              |
| Dados pessoais  | a tela só exibe NPS, quantidades, percentuais, datas e nomes de setor. Não há texto de manifestação, contato, protocolo, equipe, turno ou usuário — nem no E42, nem na interface         |

## Conteúdo

- **Cabeçalho:** FHDOD — Experiência do Paciente; período (ex.: "Últimos 30 dias", datas do E42) e
  a hora em que a API calculou os dados (`generatedAt`, fuso America/Sao_Paulo).
- **NPS geral do hospital** (160 px), **respostas consideradas** (64 px), **% de promotores**
  (notas 9 e 10) e **% de detratores** (notas 0 a 6).
- **Tendência do NPS:** um ponto por dia (7 e 30 dias) ou por semana (90 dias), como vem do E42,
  de −100 a 100. Pontos sem respostas ou suprimidos ficam vazios (a linha é interrompida; nenhum
  valor é inventado). O SVG não tem texto: eixos e datas são HTML (24 px). Leitores de tela têm a
  série completa em uma tabela.
- **NPS por setor:** até 8 setores, na ordem do E42 (maior NPS primeiro), com o número de
  respostas de cada um.
- **Convite** (texto institucional fixo): "Sua opinião melhora o nosso atendimento. Avalie o setor
  em que você foi atendido pelo QR Code do cartaz." e o aviso "Ambiente acadêmico — dados fictícios.".

Números em pt-BR (vírgula decimal, RNF29) com o sinal de menos tipográfico (−), mais visível à
distância.

## Estados

| Estado                                     | O que aparece                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carregamento inicial                       | "Carregando os indicadores…" (`role="status"`)                                                                                                          |
| Falha antes de qualquer dado               | "Não foi possível carregar os indicadores. Uma nova tentativa é feita automaticamente a cada minuto." (`role="alert"`)                                  |
| Dados carregados                           | indicadores, tendência e setores                                                                                                                        |
| Sem respostas (`n = 0`, `nps: null`)       | "Sem respostas no período" no lugar do NPS (**nunca 0**, RF60); `0 respostas consideradas`; percentuais "—"; "Nenhuma resposta no período."             |
| Total suprimido (`overall.suppressed`)     | "Menos de 5 respostas" e "O resultado aparece a partir de 5 respostas no período."; nenhum número de respostas; percentuais "—"                         |
| Dados parciais (setores/pontos suprimidos) | só os setores que o E42 enviou; nota fixa "Setores com menos de 5 respostas não aparecem, para proteger o anonimato."; pontos suprimidos vazios         |
| API indisponível com dados na tela         | os **últimos dados válidos** continuam na tela e o aviso "Sem conexão com o servidor. Exibindo os últimos dados recebidos, das hh:mm…" (`role="alert"`) |
| Dados desatualizados sem falha registrada  | após 2,5 min sem atualização (ex.: aba oculta), "Dados desatualizados. Exibindo os últimos dados recebidos, das hh:mm…"                                 |
| Recuperação                                | na primeira consulta bem-sucedida, os dados são trocados e o aviso some                                                                                 |

O frontend não reconstrói nem infere valores suprimidos: não calcula setores ocultos a partir do
total, não completa a lista de setores e não exibe nenhum `n` que o E42 tenha anulado (RN21).

## Atualização (RF69)

| Regra                | Implementação (`useTvWallSummary`, `usePeriodicReload`)                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consulta a cada 60 s | `refetchInterval: 60_000` do TanStack Query, sem recarregar a página; o mesmo intervalo do cache público do E42 (`max-age=60`)                                                                                       |
| Cache de 60 s        | `staleTime` de 60 s: nenhuma consulta antes de os dados terem 60 s. O `fetch` usa `cache: 'no-store'` (cliente HTTP único), para cada consulta trazer o valor atual do servidor — nova resposta aparece em até ~60 s |
| Falha da API         | rede, 5xx, 429 ou resposta fora do contrato: os dados anteriores são mantidos (`data` do TanStack) e o aviso aparece. Uma nova tentativa rápida (2 s) só para falhas transitórias; 400 e 429 esperam o próximo ciclo |
| Sem duplicidade      | consultas iguais são compartilhadas; o `AbortSignal` não é usado (com ele, a montagem dupla do `StrictMode` cancelava a 1ª consulta e fazia outra)                                                                   |
| Aba oculta           | o intervalo pausa (`refetchIntervalInBackground: false`); ao voltar, consulta na hora se os dados tiverem mais de 60 s                                                                                               |
| Recarga a cada 6 h   | `window.location.reload()` após 6 h. Com a API fora e dados na tela, a recarga é **adiada** até a API voltar (recarregar apagaria os últimos dados válidos)                                                          |
| Temporizadores       | todos criados em `useEffect` e encerrados ao desmontar (testado)                                                                                                                                                     |

## Legibilidade (RF70, RNF06)

Referência 1920 × 1080. Os tamanhos ficam em tokens do Tailwind (`src/styles/index.css`) e valem
na variante `tv:` (tela com pelo menos 1600 × 1000 px):

| Nível   | Token            | Tamanho | Uso                                                                   |
| ------- | ---------------- | ------- | --------------------------------------------------------------------- |
| NPS     | `text-tv-hero`   | 160 px  | NPS geral                                                             |
| Números | `text-tv-number` | 64 px   | respostas consideradas, % de promotores e detratores, NPS dos setores |
| Rótulos | `text-tv-label`  | 32 px   | títulos, nomes dos setores, período, avisos                           |
| Mínimo  | `text-tv-small`  | 24 px   | complementos (n por setor, datas do gráfico, notas)                   |

Cores: texto `slate-900`/`slate-700` sobre branco e branco sobre `brand-800` (#a50d26, 7,82:1);
avisos em vermelho-escuro/âmbar-escuro sobre fundo claro — **todo texto com contraste de 7:1 ou
mais**. O significado nunca depende só da cor (texto e ícone, RNF08). Em 1920 × 1080 não há rolagem
horizontal nem vertical, inclusive com o aviso de indisponibilidade. Em telas menores a página usa
a escala comum e não tem rolagem horizontal (verificado em 360 e 1440 px).

**Leitura a 3 m:** verificação física, ainda **não realizada** (não pode ser comprovada por teste
automatizado). Procedimento sugerido: TV de 40" ou mais em 1920 × 1080, `/tv` em tela cheia
(F11), leitura do NPS, das contagens e de três setores por duas pessoas a 3 m; registrar foto
datada em `docs/evidencias/` do repositório da API.

## Testes

| Caso | Onde                                       | O que comprova                                                                                                                                                                                                           |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T29  | `src/features/tv-wall/TvWallPage.test.tsx` | só o E42, sem token; nenhum link/menu/botão; campos extras (protocolo, e-mail, equipe) não aparecem; valores do E42                                                                                                      |
| T29  | `e2e/tv-wall.spec.ts`                      | API real: tráfego só para o E42 sem `Authorization` nem cookies; caminhos do JSON = lista permitida; sem links, e-mail, telefone, protocolo, equipe ou turno; tela = E42 (1440, 360 e 1920 px; Chrome, Firefox e WebKit) |
| T30  | componente e `e2e/tv-wall.spec.ts`         | API real, hospital exclusivo da TV (`e2e:fixture`): 0 respostas (sem NPS 0); total com 4 suprimido e setor com 4 ausente; com a 5ª, total e setor presentes; outro setor com 4 ausente                                   |
| T31  | componente                                 | 60 s, falha com os últimos dados, rede e resposta inválida, 429 sem insistir, recuperação, 6 h, recarga adiada com a API fora, aba oculta, temporizadores encerrados                                                     |
| T31  | `e2e/tv-wall.spec.ts` (`tv-1920`)          | relógio do navegador + 60 s mostra a nova resposta; conexão recusada → aviso com os últimos dados e sem rolagem; recuperação; recarga após 6 h; no DOM: 160/64/32/24 px, todo texto ≥ 24 px e ≥ 7:1, sem rolagem         |
| T39  | `e2e/acessibilidade.spec.ts`               | axe (WCAG 2.0/2.1/2.2 A e AA) também em `/tv`                                                                                                                                                                            |

Resultados das execuções: README deste repositório e `docs/plano-e-relatorio-de-testes.md` da API.
