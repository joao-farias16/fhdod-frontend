# Plugin do Figma — FHDOD — Identidade visual

Plugin próprio para o **Figma Desktop** que atualiza o arquivo de design do FHDOD
([`sistema-hospital`](https://www.figma.com/design/kcRMvRhHs8IYRfsZkv1BLZ/sistema-hospital)) da
identidade **azul** para a identidade **branco e vermelho** do frontend e cria, sem duplicar, as
telas do frontend que ainda não estão no arquivo.

Ele existe porque a integração direta (Figma MCP) tem limite de chamadas no plano Starter: a
análise do arquivo esgotou esse limite em 07/11/2026. O plugin roda dentro do Figma, sem rede e
sem limite de chamadas.

## 1. Finalidade

| O que faz                                                                                   | O que **não** faz                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Troca os valores das variáveis `marca/*` e `perigo/700` da coleção **FHDOD — Cores**        | Não altera textos, dimensões, posições nem a organização das telas   |
| Cria as variáveis `informação/*` (azul semântico) e religa nelas os avisos/etiquetas "info" | Não recolore imagens, gradientes, sombras, ícones-mestre, QR Code    |
| Troca cores fixas da paleta azul antiga, ligando-as às variáveis                            | Não recolore nós com "logo", "ilustração", "imagem", "foto", "QR"    |
| Compara as rotas do frontend com os frames e cria as telas ausentes que sabe montar         | Não recria telas existentes; não duplica frames (verifica pelo nome) |
| Mostra progresso, resumo e problemas; cada etapa é um ponto de desfazer (Ctrl+Z)            | Não acessa rede nem bibliotecas externas                             |

Os valores vêm de `src/styles/index.css` (a verificação `npm test` desta pasta confere que o
plugin e o CSS continuam iguais):

| Variável no Figma | Antes     | Depois    | Token no frontend    |
| ----------------- | --------- | --------- | -------------------- |
| `marca/50`        | `#eff6ff` | `#fdf2f4` | `--color-brand-50`   |
| `marca/100`       | `#dbeafe` | `#fde4e7` | `--color-brand-100`  |
| `marca/700`       | `#1d4ed8` | `#c8102e` | `--color-brand-700`  |
| `marca/800`       | `#1e40af` | `#a50d26` | `--color-brand-800`  |
| `marca/950`       | `#172554` | `#4a0d16` | — (só no Figma)      |
| `perigo/700`      | `#b91c1c` | `#991b1b` | `--color-danger-700` |
| `perigo/900`      | `#7f1d1d` | `#7f1d1d` | `--color-danger-800` |
| `informação/50`   | (nova)    | `#eff6ff` | `--color-info-50`    |
| `informação/100`  | (nova)    | `#dbeafe` | —                    |
| `informação/700`  | (nova)    | `#1d4ed8` | `--color-info-700`   |
| `informação/800`  | (nova)    | `#1e40af` | `--color-info-800`   |
| `informação/950`  | (nova)    | `#172554` | `--color-info-950`   |

`sucesso/*` e `neutro/*` não mudam.

## 2. Estrutura

```text
figma-plugin/
├── manifest.json        manifesto do plugin (editorType figma, documentAccess dynamic-page, sem rede)
├── code.js              código principal (sandbox do Figma): análise, atualização e criação
├── ui.html              interface (iframe): botões, etapas, progresso, resumo e problemas
├── package.json         scripts de verificação (não há build)
├── tsconfig.json        verificação de tipos do code.js com @figma/plugin-typings
├── test/plugin.test.js  testes em Node com uma simulação da Plugin API
└── README.md            este documento
```

Não há etapa de build: o Figma carrega `code.js` e `ui.html` diretamente. `node_modules/` (só
para verificação) não é versionado.

## 3. Como importar no Figma Desktop

1. Abra o **Figma Desktop** (o app; o navegador não importa plugins locais) e o arquivo
   `sistema-hospital`.
2. Menu **Plugins › Development › Import plugin from manifest…** (em português:
   **Plugins › Desenvolvimento › Importar plugin do manifesto…**).
3. Escolha `figma-plugin/manifest.json` deste repositório.
4. O plugin aparece em **Plugins › Development › FHDOD — Identidade visual**.

É preciso permissão de edição no arquivo. A importação vale para a máquina; repita em cada
computador.

## 4. Como executar

1. **Salve uma versão** antes (menu do arquivo › _Save to version history_), para poder voltar.
2. Abra o plugin. O topo mostra o projeto, o arquivo e a versão do plugin.
3. Clique em **1. Analisar documento**. Nada é alterado. O plugin percorre todas as páginas e
   frames em lotes e mostra:
   - as variáveis e os valores atuais × novos;
   - as telas do frontend ausentes no Figma;
   - cada frame com o número de camadas, pinturas a alterar, pinturas ligadas a `marca/*` e
     imagens preservadas (clique no nome para ir até o frame);
   - os possíveis problemas.
4. Escolha as etapas (todas marcadas por padrão) e clique em **2. Executar atualização**.
5. Confira as telas e rode **Analisar documento** de novo: o resultado esperado é
   `0 a alterar` em todas as telas e nenhuma tela ausente.

## 5. Como atualizar as telas (o que cada etapa faz)

1. **Variáveis** — cria `informação/50…950` (escopos de preenchimento, texto e borda) e troca os
   valores de `marca/*` e `perigo/700`. Tudo o que já está ligado a `marca/*` (cabeçalhos,
   botões primários, itens de menu, Marca FHDOD…) fica vermelho sem tocar nas camadas.
2. **Componentes** — percorre o frame **Componentes** primeiro (as instâncias herdam do
   componente principal). Variantes de **Aviso**, **Etiqueta**, **Alerta** ou **Tag** cujo nome
   contém "info"/"informação" e as instâncias delas são religadas de `marca/*` para
   `informação/*`, para que um aviso informativo não pareça erro. O frame **Ícones** é só
   analisado.
3. **Telas existentes** — em cada frame, pinturas sólidas **sem variável** com as cores antigas
   (`#1d4ed8`, `#1e40af`, `#eff6ff`, `#dbeafe`, `#172554`, `#b91c1c` e, por aproximação,
   `#2563eb`, `#3b82f6`, `#1e3a8a`, `#bfdbfe`) passam a usar a variável correspondente. Trechos de
   texto com várias cores são tratados um a um. As telas alteradas recebem a marca interna
   `fhdod-identidade = vermelho-v1` (dados do plugin).
4. **Criar telas ausentes** — compara os frames com as 24 telas/estados do frontend
   (`src/app/routes.tsx` e diálogos). No arquivo analisado, todas as rotas têm tela; faltam os três
   diálogos da Gestão de usuários, que o plugin monta sobre uma cópia da TL16, à direita do
   conteúdo existente:
   - `TL16 – Novo usuário – Computador – Diálogo` (`UserFormDialog.tsx`, perfil ainda não escolhido);
   - `TL16 – Senha temporária – Computador – Diálogo` (`TemporaryPasswordDialog.tsx`, senha fictícia);
   - `TL16 – Desativar usuário – Computador – Confirmação` (`ConfirmDialog.tsx`, botão de perigo).

   Os diálogos usam as variáveis da coleção, os ícones `Ícone/*` e, quando a variante é
   encontrada, instâncias do componente **Botão** (senão, frames equivalentes). Uma tela com o
   mesmo nome nunca é criada de novo.

## 6. Como interpretar os resultados

- **Telas analisadas**: frames de tela (exclui os frames de biblioteca Ícones e Componentes).
- **Telas atualizadas**: telas com pinturas trocadas ou ligadas a `marca/*` (estas mudam pela
  etapa de variáveis).
- **Telas criadas**: telas criadas pelo plugin (marca `fhdod-tela-criada`).
- **Problemas** (a contagem exclui "revisar"):
  - `erro` — a operação falhou (a mensagem do Figma é mostrada) ou falta uma tela que o plugin não
    sabe montar;
  - `aviso` — algo não foi alterado por segurança (variável/estilo de biblioteca externa, fonte
    ausente, componente não encontrado);
  - `revisar` — decisão visual manual: elemento protegido com azul antigo, gradiente, sombra,
    cor trocada por aproximação ou frame sem tela correspondente no frontend.

## 7. Limitações conhecidas

- **Execução no Figma Desktop não testada por este repositório.** O código foi verificado por
  tipos contra `@figma/plugin-typings` (modo `strict`) e por testes com uma simulação da API; a
  execução real depende de teste manual (seção 4).
- A identificação de "informação" é **por nome** (conjunto Aviso/Etiqueta/Alerta/Tag + variante
  com "info"). Avisos azuis montados à mão, fora desses componentes, ficam vermelhos — confira-os
  na análise ("revisar").
- `marca/950` não tem equivalente no frontend; recebeu um vinho escuro (`#4a0d16`). Se ele for
  usado como texto de aviso informativo fora dos componentes, revise.
- Imagens, gradientes, efeitos (sombras), vídeos, ícones-mestre e nós protegidos por nome não são
  alterados; aparecem como "revisar" quando usam o azul antigo.
- Variáveis e estilos de **bibliotecas externas** não podem ser alterados pelo plugin (a API só
  edita os locais); são listados como "aviso".
- Variáveis que são _alias_ de outra variável não são alteradas.
- Com `documentAccess: dynamic-page`, cada página é carregada sob demanda (`loadAsync`); arquivos
  com muitas páginas grandes podem demorar. O processamento é feito em lotes de 150 camadas,
  devolvendo o controle ao Figma entre eles, e pode ser cancelado.
- As telas criadas são estáticas (como as demais do arquivo): sem protótipo/interações.
- A cor institucional exata da FHDOD não foi encontrada em fonte pública; `#c8102e` é uma
  aproximação a confirmar com a instituição (trocar o valor exige alterar `src/styles/index.css`,
  `VARIABLE_TARGETS` em `code.js` e rodar o plugin de novo).

## Verificação do código

```bash
cd figma-plugin
npm install          # só @figma/plugin-typings e TypeScript
npm run check        # tipos (tsc) + testes (node --test)
```
