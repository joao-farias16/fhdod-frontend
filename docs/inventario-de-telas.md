# Inventário de telas do frontend

Levantamento feito em **21/11/2026**, branch `develop` (último commit `7dafecf`), lendo diretamente o
código em `src/` (rotas em `src/app/routes.tsx` e `src/app/AdminArea.tsx`, telas em
`src/features/`). Serve de base para a atualização do Figma. Não foi usado nenhum relatório antigo
como fonte; onde algo não pôde ser confirmado pelo código, está dito.

Convenções: **TLnn** é o código da tela usado nos comentários do código e no Figma (`sistema-hospital`);
"API" lista os endpoints de `/api/v1` realmente chamados pela tela. Permissões vêm de `GET /me`
(`RequirePermission`); sem a permissão a rota mostra a página "sem acesso" (`ForbiddenPage`).
O controle de acesso real é do backend.

## Resumo das rotas

| #   | Rota                                | Tela                            | TL         | Layout                              | Acesso                                |
| --- | ----------------------------------- | ------------------------------- | ---------- | ----------------------------------- | ------------------------------------- |
| 1   | `/`                                 | Página inicial                  | —          | público (`AppLayout`)               | público                               |
| 2   | `/p/:slug` (`?origem=qr` ou `link`) | Pesquisa pública e manifestação | TL09, TL11 | público (`AppLayout`)               | público, sem login e sem cookies      |
| 3   | `/tv` (`?periodo=7d`/`30d`/`90d`)   | TV Wall                         | TL15       | próprio (sem cabeçalho/menu/rodapé) | público, sem login e sem cookies      |
| 4   | `/login`                            | Acesso administrativo           | TL01       | próprio (sem menu)                  | público                               |
| 5   | `/trocar-senha`                     | Troca de senha                  | TL02       | `AdminLayout`                       | sessão                                |
| 6   | `/painel`                           | Painel geral                    | TL03       | `AdminLayout`                       | `dashboard:read`                      |
| 7   | `/painel/setores/:sectorId`         | Painel por setor                | TL04       | `AdminLayout`                       | `dashboard:read`                      |
| 8   | `/ouvidoria/manifestacoes`          | Lista de manifestações          | TL12       | `AdminLayout`                       | `manifestations:read`                 |
| 9   | `/ouvidoria/manifestacoes/:id`      | Detalhe da manifestação         | TL13       | `AdminLayout`                       | `manifestations:read`                 |
| 10  | `/relatorios`                       | Relatórios Excel                | TL14       | `AdminLayout`                       | qualquer permissão `reports:*`        |
| 11  | `/admin/usuarios`                   | Gestão de usuários              | TL16       | `AdminLayout`                       | `users:read`                          |
| 12  | `/admin/auditoria`                  | Auditoria                       | TL17       | `AdminLayout`                       | `audit_logs:read`                     |
| 13  | `/admin/setores`                    | Setores e equipes               | TL05       | `AdminLayout`                       | `teams:create` (botões por permissão) |
| 14  | `/admin/turnos`                     | Escala e turnos                 | TL06       | `AdminLayout`                       | `shifts:read`                         |
| 15  | `/admin/escalas/importar`           | Importação de escalas           | TL07       | `AdminLayout`                       | `rosters:import`                      |
| 16  | `/admin/pesquisas`                  | Lista de pesquisas              | TL08       | `AdminLayout`                       | `surveys:read`                        |
| 17  | `/admin/pesquisas/:id`              | Edição da pesquisa              | TL08       | `AdminLayout`                       | `surveys:update`                      |
| 18  | `/admin/pesquisas/:id/cartaz`       | Cartaz A4 com QR Code           | —          | próprio (sem menu, para impressão)  | `surveys:read`                        |
| 19  | qualquer outra                      | Página não encontrada (404)     | —          | público (`AppLayout`)               | público                               |

Os códigos TL01–TL17 vêm dos comentários do código; a correspondência exata com os nomes das telas no
Figma **não pôde ser confirmada** a partir deste repositório (o Figma não foi consultado).

**Layouts**

- `AppLayout` (público): link "Pular para o conteúdo", cabeçalho vermelho (logotipo FHDOD e "Gestão da Experiência do Paciente"), conteúdo e rodapé "Ambiente acadêmico — somente dados fictícios…".
- `AdminLayout`: cabeçalho vermelho com logotipo (leva à tela inicial do perfil), menu por permissão (Painel, Ouvidoria, Relatórios, Pesquisas, Setores e equipes, Escalas, Usuários, Auditoria), nome e perfil do usuário, "Trocar senha", "Sair"; no celular o menu vira botão "Menu". Com troca de senha obrigatória o menu e "Trocar senha" ficam ocultos. Rodapé com aviso de dados fictícios.
- Tela inicial por perfil (`homePathFor`): `/admin/usuarios` se tiver `users:read` (Superadministrador); senão `/painel`.
- Perfis: Superadministrador, Administrador de setor, Gestão, Ouvidoria e Visualizador.

**Componentes compartilhados** (`src/components/ui/`): `Button` (primário, secundário, perigo, fantasma), `Field` (campo de texto, seleção), `Alert` (info, sucesso, erro, com `requestId`), `Dialog`, `ConfirmDialog`, `Tag`, e em `States.tsx` `Loading`, `ErrorState` (com "Tentar novamente"), `EmptyState` e `Pagination`.

---

## 1. Página inicial — `/`

- **Objetivo:** identificar o sistema e mostrar se a API responde.
- **Componentes:** `HomePage`, `ApiStatusCard`.
- **Conteúdo:** título "Sistema de Gestão da Experiência do Paciente", texto de apresentação, cartão com a situação da API e cartão "Estado do desenvolvimento".
- **Ações do usuário:** nenhuma (não há link nem botão para o login; o acesso é digitando `/login`).
- **Estados:** carregando, API disponível, API indisponível (cartão de situação; ver `ApiStatusCard.tsx`).
- **API:** `GET /health`.

## 2. Pesquisa pública e manifestação — `/p/:slug`

- **TL:** TL09 (pesquisa), TL11 (manifestação). **Objetivo:** o paciente avalia o setor e, se quiser, registra uma manifestação, sem login e sem cookies.
- **Componentes:** `PublicSurveyPage`, `SurveyFlow`, `ScoreScale`, `ManifestationForm`, `use-inactivity`, `survey-storage`.
- **Origem:** `?origem=qr` grava a origem "QR Code"; qualquer outro valor ou ausência grava "Link".
- **Fluxo:** etapa 1 = nota geral de 0 a 10 (`ScoreScale`); depois uma etapa por etapa da jornada com perguntas específicas (notas de 1 a 5). Barra e texto "Etapa X de N", botões "Voltar", "Próxima" e "Enviar" (e "Enviar agora" nas etapas intermediárias, depois da nota geral). Confirmação final com agradecimento, protocolo (quando há manifestação) e retorno automático ao início em 30 s.
- **Manifestação:** após a avaliação, pergunta "Quer contar o que aconteceu?"; formulário com tipo (elogio, reclamação, sugestão), descrição (até 2.000 caracteres, obrigatória), identificação opcional (nome, telefone com DDD, e-mail; anônima por padrão) e aceite para contato. Mostra o protocolo na confirmação.
- **Diálogos:** "Você ainda está aí?" — aviso de inatividade após 3 min, com contagem de 60 s; ao esgotar, apaga respostas e texto (`fhdod:*` no `sessionStorage`).
- **Estados:** carregando; pesquisa não encontrada (404, "Pesquisa não encontrada"); indisponível (410, "Pesquisa indisponível"); falha ao abrir (rede ou 429) com "Tentar novamente"; erro de validação por campo; "Sua resposta ainda não foi enviada" com "Tentar enviar de novo"; envio em andamento (`aria-busy`); confirmação.
- **Persistência local:** respostas em andamento no `sessionStorage`, apagadas na conclusão e por inatividade.
- **API:** `GET /public/surveys/:slug`; `POST /public/responses` (com `Idempotency-Key`); `POST /public/manifestations`.

## 3. TV Wall — `/tv`

- **TL:** TL15. **Objetivo:** painel público para TV com indicadores agregados.
- **Componentes:** `TvWallPage`, `TvTrendChart`, hooks em `tv-wall-hooks.ts`.
- **Conteúdo:** cabeçalho (nome do sistema, período, hora dos dados), NPS geral (160 px), respostas consideradas, % de promotores e de detratores, gráfico de tendência (dia ou semana), NPS por setor (no máximo 8), convite e aviso de ambiente acadêmico.
- **Ações do usuário:** nenhuma (sem links, botões ou campos). Único parâmetro: `?periodo=7d|30d|90d` (padrão `30d`).
- **Estados:** carregando; falha antes de qualquer dado; dados carregados; sem respostas (n = 0); total suprimido (< 5 respostas); setores/pontos suprimidos; API indisponível com os últimos dados e aviso; dados desatualizados (> 2,5 min); recuperação.
- **Comportamento:** atualiza a cada 60 s (pausa em aba oculta), prazo de 15 s por consulta, recarga da página a cada 6 h (adiada se a API estiver fora).
- **API:** somente `GET /tv-wall/summary?period=…`, sem `Authorization`. Detalhes em [`tv-wall.md`](tv-wall.md).

## 4. Acesso administrativo — `/login`

- **TL:** TL01. **Objetivo:** autenticar usuários administrativos.
- **Componentes:** `LoginPage`, `AuthProvider`, `Alert`.
- **Ações:** informar e-mail e senha, "Entrar" (botão de largura total, desabilitado durante o envio).
- **Estados:** verificando sessão; sessão existente redireciona (para `/trocar-senha` se a troca for obrigatória, à rota de origem ou à tela inicial do perfil); aviso informativo ("Sua sessão terminou", conta desativada); erro genérico para credenciais recusadas; aviso de muitas tentativas (429).
- **API:** `POST /auth/login`; `GET /me`; renovação por `POST /auth/refresh`.

## 5. Troca de senha — `/trocar-senha`

- **TL:** TL02. **Objetivo:** trocar a senha (obrigatória no primeiro acesso ou após redefinição).
- **Campos:** "Nova senha" e "Confirme a nova senha"; lista de regras: 10 a 72 caracteres, ao menos uma letra, ao menos um número.
- **Ações:** salvar; "Cancelar"/voltar quando a troca não é obrigatória. Quando obrigatória, o menu fica oculto.
- **Estados:** erro de regras (400), sessão encerrada (401), muitas tentativas (429), erro genérico com `requestId`; sucesso redireciona à tela inicial do perfil.
- **API:** `POST /me/password`; `GET /me`.

## 6. Painel geral — `/painel`

- **TL:** TL03. **Objetivo:** indicadores de NPS da experiência do paciente no escopo do usuário.
- **Componentes:** `DashboardPage`, `DashboardFiltersForm`, `DashboardWidgets` (`SummaryCards`, `DistributionChart`, `TrendChart`, `GroupTable`, `NoData`, `Panel`), `ExportButtons`.
- **Conteúdo:** saudação "Olá, <nome>", período, perfil e escopo (setores); cartões NPS, promotores (9 e 10), passivos (7 e 8), detratores (0 a 6), manifestações e cobertura de atribuição, com `n`; distribuição das notas de 0 a 10; tendência do NPS (gráfico e tabela); tabela "Resultados por setor" com link para o painel do setor (mantém os filtros); comparação com o período anterior.
- **Filtros (espelhados na URL):** Período (7, 30, 90 dias, este mês, personalizado), De, Até, Setor, Pesquisa, Turno, Equipe, Origem (QR Code/Link). Ações: "Filtrar", "Limpar", "Atualizar".
- **Ações:** exportar respostas e indicadores em Excel (botões conforme a permissão; manifestações não aparecem aqui).
- **Estados:** carregando; erro com nova tentativa (por bloco); sem dados (`NoData` com "limpar filtros"); aviso de sucesso vindo de outra tela (`notice`); Visualizador: grupos com menos de 5 respostas ocultos; sem setor associado.
- **Atualização:** a cada 60 s com a aba visível.
- **API:** `GET /dashboard/summary`, `/dashboard/sectors`, `/dashboard/trends`; `GET /admin/surveys?pageSize=100` e setores/equipes para os filtros; `GET /reports/export`.

## 7. Painel por setor — `/painel/setores/:sectorId`

- **TL:** TL04. **Objetivo:** detalhar um setor.
- **Conteúdo:** nome do setor, cartões, distribuição, tendência, "Perguntas por etapa da jornada" (por etapa), "Por turno", "Por equipe" e cobertura; mesmos filtros e exportação do painel geral.
- **Estados:** carregando, erro com nova tentativa por bloco, sem dados, supressão ("grupos pequenos ocultos"), setor desativado.
- **API:** `GET /dashboard/summary`, `/dashboard/trends`, `/dashboard/questions`, `/dashboard/shifts`, `/dashboard/teams`.

## 8. Lista de manifestações — `/ouvidoria/manifestacoes`

- **TL:** TL12. **Objetivo:** triagem das manifestações (Ouvidoria).
- **Filtros:** De, Até, Status, Tipo, Prioridade, Setor, Protocolo, Contato (com/sem), Ordenar por (mais recentes, mais antigas, maior prioridade); "Filtrar" e "Limpar".
- **Tabela:** Recebida em, Setor, Tipo, Status, Prioridade, Trecho, Contato; protocolo/linha leva ao detalhe; paginação.
- **Rótulos:** tipo (Elogio, Reclamação, Sugestão); status (Recebida, Em análise, Encaminhada, Concluída, Arquivada); prioridade (Baixa, Média, Alta).
- **Estados:** carregando; erro com nova tentativa; vazio ("Nenhuma manifestação encontrada").
- **API:** `GET /ouvidoria/manifestations`.

## 9. Detalhe da manifestação — `/ouvidoria/manifestacoes/:id`

- **TL:** TL13. **Objetivo:** ler e tratar uma manifestação.
- **Seções:** cabeçalho "Manifestação <protocolo>"; texto da manifestação; resposta da pesquisa associada (nota, "nota baixa", respostas de 1 a 5 às perguntas específicas, ou "Sem respostas às perguntas específicas"); linha do tempo; tratamento; notas; contato.
- **Tratamento (`ManifestationTreatment`):** "Novo status", "Prioridade", providências, salvar; notas internas (não editáveis, nunca exportadas) com adição.
- **Contato (`ManifestationContact`):** ver telefone/e-mail/aceite por ação explícita (auditada pela API); eliminar contato em diálogo "Eliminar os dados de contato?" com motivo (Pedido do titular, Retorno concluído, …).
- **Estados:** carregando; manifestação não encontrada; erro com nova tentativa; "Alteração não salva" (com `requestId`); "Alterações salvas"; contato indisponível/eliminado.
- **API:** `GET` e `PATCH /ouvidoria/manifestations/:id`; `POST /ouvidoria/manifestations/:id/notes`; `/ouvidoria/manifestations/:id/contact` (visualização por ação explícita e `DELETE` com motivo; o verbo da visualização está em `manifestations-api.ts`).

## 10. Relatórios — `/relatorios`

- **TL:** TL14. **Objetivo:** gerar arquivos Excel (.xlsx).
- **Campos:** "Relatório" (respostas, indicadores, manifestações — só os permitidos ao perfil), filtros do painel e, para manifestações, "Status" e "Tipo de manifestação".
- **Ações:** gerar/baixar arquivo.
- **Estados:** gerando; sucesso ("Arquivo gerado: <nome>"); erro "Não foi possível gerar o relatório" com `requestId`; limites informados pela API.
- **API:** `GET /reports/export` (download).

## 11. Gestão de usuários — `/admin/usuarios`

- **TL:** TL16. **Componentes:** `UsersPage`, `UserFormDialog`, `TemporaryPasswordDialog`, `ConfirmDialog`.
- **Filtros:** Buscar por nome ou e-mail, Perfil, Situação, Setor.
- **Tabela:** Nome, Perfil, Escopo, Situação, Ações (Editar, Redefinir senha, Desativar/Reativar); paginação.
- **Ações:** "Novo usuário"; editar; desativar/reativar (confirmação); redefinir senha (confirmação) com exibição única da senha temporária e botão de copiar.
- **Diálogos:** "Novo usuário"/"Editar usuário" (Nome completo, E-mail, Perfil com descrição, escopo "todos os setores" ou "setores específicos" com lista de setores — a lista não se aplica ao Superadministrador); confirmação de desativar/reativar; "Redefinir senha"; "Senha temporária" (copiar, "Concluir").
- **Estados:** carregando; erro; vazio ("Nenhum usuário encontrado"); erros de campo (conflito de e-mail etc.) e aviso de sucesso.
- **API:** `GET/POST /admin/users`, `PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password`; setores para a lista.

## 12. Auditoria — `/admin/auditoria`

- **TL:** TL17. **Filtros:** De, Até (máximo 366 dias; padrão 30), Autor, Ação, Entidade, Identificador da entidade, Itens por página.
- **Tabela:** Data e hora, Autor, Ação, Entidade, Detalhes; paginação. Rótulos em português em `audit-labels.ts`.
- **Estados:** carregando; erro; vazio ("Nenhum evento encontrado"); intervalo inválido.
- **API:** `GET /admin/audit-logs`; `GET /admin/users?pageSize=100` (lista de autores).

## 13. Setores e equipes — `/admin/setores`

- **TL:** TL05. **Estrutura:** tabela de setores (Código, Nome, Equipes ativas, Pesquisas ativas, Situação, Ações) e, ao selecionar um setor, a lista de equipes dele.
- **Ações:** "Novo setor" (somente com `sectors:create`), editar e desativar/reativar setor; "Nova equipe" (`teams:create`; desabilitado em setor desativado), editar (`teams:update`) e desativar/reativar equipe.
- **Diálogos:** "Novo setor"/"Editar setor" (Código, Nome, Descrição opcional); "Nova equipe"/"Editar equipe" (Código, Nome); confirmações de desativar/reativar setor e equipe.
- **Estados:** carregando (setores e equipes); vazio ("Nenhum setor no seu escopo", "Nenhuma equipe neste setor"); erros de campo; sucesso.
- **API:** `GET/POST /admin/sectors`, `PATCH /admin/sectors/:id`, `GET/POST /admin/teams`, `PATCH /admin/teams/:id`.

## 14. Escala e turnos — `/admin/turnos`

- **TL:** TL06. **Filtros:** Setor, Equipe, De, Até (intervalo máximo de 62 dias).
- **Lista:** turnos do período agrupados por dia, cada um com horário (e "dia seguinte" quando termina no dia seguinte), equipe, período, origem ("Importado" ou "Manual") e, se cancelado, "Cancelado: <motivo>".
- **Ações:** "Importar escala" (com `rosters:import`, leva à tela 15); "Novo turno" (`shifts:create`); "Cancelar" turno (`shifts:cancel`).
- **Diálogos:** "Novo turno" (Equipe, Data, Período, Início, Fim); "Cancelar turno" (Motivo do cancelamento, ação de perigo).
- **Estados:** carregando; erro; vazio ("Nenhum turno no período"); erros de campo; sucesso.
- **API:** `GET/POST /admin/shifts`, `PATCH /admin/shifts/:id` (cancelamento irreversível com motivo); equipes e setores para os campos.

## 15. Importação de escalas — `/admin/escalas/importar`

- **TL:** TL07. **Regras exibidas:** CSV em UTF-8, separado por ponto e vírgula, até 2.000 linhas e 1 MB.
- **Ações:** escolher arquivo, validar ("Enviar"), baixar modelo (`modelo-escala-fhdod.csv`), confirmar importação, link de volta para a escala.
- **Estados:** erro ao continuar; "Arquivo recusado"; tabela "Erros por linha"; "Arquivo válido" com contagem (linhas aceitas) e botão de confirmar; "Escala importada" com link para `/admin/turnos`.
- **API:** `POST /admin/rosters/import` (pré-validação, sem gravar); `POST /admin/rosters/imports/:id/confirm`.

## 16. Pesquisas — `/admin/pesquisas`

- **TL:** TL08. **Filtros:** Setor, Situação (Rascunho, Publicada, Desativada), Buscar por título ou endereço.
- **Lista:** itens com título, setor, situação (`Tag`) e link para a edição; paginação.
- **Ação:** "Nova pesquisa" (diálogo com Setor, Título, Endereço (slug), Introdução opcional, Agradecimento opcional; ao criar leva ao editor).
- **Estados:** carregando; erro; vazio ("Nenhuma pesquisa encontrada").
- **API:** `GET/POST /admin/surveys`.

## 17. Edição da pesquisa — `/admin/pesquisas/:id`

- **TL:** TL08. **Seções:** dados (Título, Setor, Endereço, Introdução, Agradecimento, "Pergunta geral (0 a 10)"; salvar só com alterações); perguntas específicas por etapa da jornada (nova, editar, subir/descer, ativar/desativar); "Link e QR Code" (URLs com `?origem=qr` e `?origem=link`, QR Code em PNG e SVG, link para o cartaz); "Versões" (número, vigente, publicada em/por, substituída em, perguntas).
- **Ações:** "Publicar versão N" e "Desativar/Reativar pesquisa" (ambas com confirmação); "Publicar" fica desabilitado sem alterações desde a última publicação ou com a pesquisa desativada (a dica aparece no `title` do botão).
- **Diálogos:** "Nova pergunta específica"/"Editar pergunta" (Texto da pergunta, Etapa da jornada); "Publicar versão N"; "Desativar/Reativar pesquisa".
- **Estados:** carregando; erro; rascunho/publicada/desativada; sem versões; aviso de sucesso.
- **API:** `GET/PATCH /admin/surveys/:id`, `POST /admin/surveys/:id/publish`, `GET /admin/surveys/:id/qr`, `GET /admin/journey-stages`, perguntas enviadas no `PATCH` de `/admin/surveys/:id` (campo `questions`).

## 18. Cartaz A4 — `/admin/pesquisas/:id/cartaz`

- **Objetivo:** imprimir o QR Code. Sem layout administrativo.
- **Conteúdo:** nome do setor, "Conte para nós como foi o atendimento", título da pesquisa, QR Code (360 px), instrução, aviso de anonimato, endereço por extenso.
- **Ações:** "Imprimir cartaz" (`window.print()`, oculto na impressão; página A4, margem 15 mm).
- **Estados:** "Preparando o cartaz…"; erro com nova tentativa.
- **API:** `GET /admin/surveys/:id/qr` (links).

## 19. Página não encontrada — qualquer outra rota

- Título "Página não encontrada", texto "O endereço acessado não existe. Confira o link recebido." e botão "Voltar ao início" (`/`).

---

## Pontos que não puderam ser confirmados apenas pelo código

- Nomes exatos das telas e quadros no Figma (o plugin `figma-plugin/` cria apenas três diálogos de usuários; o README informa que a TV Wall e outras telas podem estar ausentes do arquivo).
- O verbo HTTP da visualização do contato da manifestação e a lista completa de motivos de eliminação: consulte `manifestations-api.ts`.
- Os textos do cartão de situação da API na página inicial além de "API disponível" e "Tentar novamente": consulte `ApiStatusCard.tsx`.
- O que o usuário vê em produção: o frontend publicado não foi aberto nesta auditoria.
