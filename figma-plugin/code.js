// @ts-check
/**
 * Plugin "FHDOD — Identidade visual" (Figma Desktop).
 *
 * Atualiza o arquivo de design do FHDOD da identidade azul para a identidade branco e vermelho
 * do frontend (src/styles/index.css) e cria as telas do frontend que ainda não estão no arquivo.
 *
 * Etapas (executadas manualmente pela interface, cada uma com um ponto de desfazer próprio):
 *   1. Variáveis — cria `informação/*` (azul) e troca `marca/*` e `perigo/700` para os novos valores.
 *   2. Avisos e etiquetas informativos — religa de `marca/*` para `informação/*`, para que
 *      "informação" não pareça erro dentro de uma identidade vermelha.
 *   3. Cores fixas — troca as pinturas sólidas sem variável que usam a paleta azul antiga, ligando-as
 *      às variáveis correspondentes. Imagens, gradientes, ícones-mestre, QR Code, logotipos e
 *      ilustrações não são alterados (são listados como "revisar").
 *   4. Telas ausentes — cria, sem duplicar, as telas do frontend que não têm frame no arquivo.
 *
 * Não depende de rede. Não altera textos, dimensões nem a organização das telas existentes.
 */

/* ------------------------------------------------------------------------------------------------
 * Dados da identidade (fonte: src/styles/index.css do frontend)
 * ---------------------------------------------------------------------------------------------- */

const PLUGIN_VERSION = '1.0.0';
const MARK_KEY = 'fhdod-identidade';
const MARK_VALUE = 'vermelho-v1';
const CREATED_KEY = 'fhdod-tela-criada';
const COLLECTION_NAME = 'FHDOD — Cores';
const BATCH_SIZE = 150;

/** Valores finais das variáveis da coleção "FHDOD — Cores" (hex sem #). */
/** @type {Record<string, string>} */
const VARIABLE_TARGETS = {
  'marca/50': 'fdf2f4',
  'marca/100': 'fde4e7',
  'marca/700': 'c8102e',
  'marca/800': 'a50d26',
  'marca/950': '4a0d16',
  'perigo/700': '991b1b',
  'perigo/900': '7f1d1d',
};

/** Variáveis criadas para preservar o azul semântico de "informação". */
/** @type {Record<string, string>} */
const INFO_VARIABLES = {
  'informação/50': 'eff6ff',
  'informação/100': 'dbeafe',
  'informação/700': '1d4ed8',
  'informação/800': '1e40af',
  'informação/950': '172554',
};

/** Correspondência marca → informação, para religar avisos e etiquetas informativos. */
/** @type {Record<string, string>} */
const BRAND_TO_INFO = {
  'marca/50': 'informação/50',
  'marca/100': 'informação/100',
  'marca/700': 'informação/700',
  'marca/800': 'informação/800',
  'marca/950': 'informação/950',
};

/**
 * Cores fixas (sem variável) da paleta antiga e a variável que passa a representá-las.
 * `exact` = cor do design system antigo; as demais são tons de azul do Tailwind tratados por
 * aproximação (listados no relatório como "aproximação").
 */
/** @type {Record<string, { brand: string, info: string, exact: boolean }>} */
const LEGACY_COLORS = {
  '1d4ed8': { brand: 'marca/700', info: 'informação/700', exact: true },
  '1e40af': { brand: 'marca/800', info: 'informação/800', exact: true },
  eff6ff: { brand: 'marca/50', info: 'informação/50', exact: true },
  dbeafe: { brand: 'marca/100', info: 'informação/100', exact: true },
  172554: { brand: 'marca/950', info: 'informação/950', exact: true },
  b91c1c: { brand: 'perigo/700', info: 'perigo/700', exact: true },
  '2563eb': { brand: 'marca/700', info: 'informação/700', exact: false },
  '3b82f6': { brand: 'marca/700', info: 'informação/700', exact: false },
  '1e3a8a': { brand: 'marca/800', info: 'informação/800', exact: false },
  bfdbfe: { brand: 'marca/100', info: 'informação/100', exact: false },
};

/** Frames de biblioteca que não são telas. */
const LIBRARY_FRAMES = ['ícones', 'componentes'];

/** Nomes protegidos: nunca recoloridos automaticamente. */
const PROTECTED_NAME = /(logo|logotipo|ilustra|imagem|foto|qr ?code|favicon)/i;

/** Componentes com variante semântica "informação". */
const SEMANTIC_SET = /^(aviso|etiqueta|alerta|tag)\b/i;
const INFO_VARIANT = /\binfo(rma[cç][aã]o|rmativo)?\b/i;

/**
 * Telas do frontend (src/app/routes.tsx), na nomenclatura da Seção 11
 * (`TLxx – Nome – Dispositivo – Estado`). `create` indica as telas que o plugin sabe montar.
 */
const EXPECTED_SCREENS = [
  { id: 'inicio', route: '/', label: 'Início', match: /^in[ií]cio\b/i },
  { id: 'tl01', route: '/login', label: 'TL01 Login', match: /^tl01\b/i },
  { id: 'tl02', route: '/trocar-senha', label: 'TL02 Troca de senha', match: /^tl02\b/i },
  { id: 'tl03', route: '/painel', label: 'TL03 Dashboard geral', match: /^tl03\b/i },
  {
    id: 'tl04',
    route: '/painel/setores/:sectorId',
    label: 'TL04 Dashboard por setor',
    match: /^tl04\b/i,
  },
  { id: 'tl05', route: '/admin/setores', label: 'TL05 Setores e equipes', match: /^tl05\b/i },
  { id: 'tl06', route: '/admin/turnos', label: 'TL06 Escala e turnos', match: /^tl06\b/i },
  {
    id: 'tl07',
    route: '/admin/escalas/importar',
    label: 'TL07 Importação de escalas',
    match: /^tl07\b/i,
  },
  {
    id: 'tl08-lista',
    route: '/admin/pesquisas',
    label: 'TL08 Pesquisas (lista)',
    match: /^tl08\s*[–-]\s*pesquisas\b/i,
  },
  {
    id: 'tl08-config',
    route: '/admin/pesquisas/:id',
    label: 'TL08 Configuração de pesquisa',
    match: /^tl08\s*[–-]\s*configura/i,
  },
  {
    id: 'tl08-cartaz',
    route: '/admin/pesquisas/:id/cartaz',
    label: 'TL08 Cartaz A4 do QR Code',
    match: /^tl08\s*[–-]\s*cartaz/i,
  },
  { id: 'tl09', route: '/p/:slug', label: 'TL09 Pesquisa pública', match: /^tl09\b/i },
  { id: 'tl10', route: '/p/:slug (manifestação)', label: 'TL10 Manifestação', match: /^tl10\b/i },
  { id: 'tl11', route: '/p/:slug (confirmação)', label: 'TL11 Confirmação', match: /^tl11\b/i },
  {
    id: 'tl12',
    route: '/ouvidoria/manifestacoes',
    label: 'TL12 Lista de manifestações',
    match: /^tl12\b/i,
  },
  {
    id: 'tl13',
    route: '/ouvidoria/manifestacoes/:id',
    label: 'TL13 Detalhes da manifestação',
    match: /^tl13\b/i,
  },
  { id: 'tl14', route: '/relatorios', label: 'TL14 Exportação de relatórios', match: /^tl14\b/i },
  {
    id: 'tl16',
    route: '/admin/usuarios',
    label: 'TL16 Gestão de usuários',
    match: /^tl16\s*[–-]\s*gest/i,
  },
  {
    id: 'tl16-novo',
    route: '/admin/usuarios (diálogo "Novo usuário")',
    label: 'TL16 Novo usuário (diálogo)',
    match: /^tl16\s*[–-]\s*novo usu/i,
    create: 'TL16 – Novo usuário – Computador – Diálogo',
  },
  {
    id: 'tl16-senha',
    route: '/admin/usuarios (diálogo "Senha temporária")',
    label: 'TL16 Senha temporária (diálogo)',
    match: /^tl16\s*[–-]\s*senha tempor/i,
    create: 'TL16 – Senha temporária – Computador – Diálogo',
  },
  {
    id: 'tl16-desativar',
    route: '/admin/usuarios (confirmação "Desativar usuário")',
    label: 'TL16 Desativar usuário (confirmação)',
    match: /^tl16\s*[–-]\s*desativar/i,
    create: 'TL16 – Desativar usuário – Computador – Confirmação',
  },
  { id: 'tl17', route: '/admin/auditoria', label: 'TL17 Auditoria', match: /^tl17\b/i },
  {
    id: 'acesso',
    route: '(rota protegida sem permissão)',
    label: 'Acesso não permitido',
    match: /^acesso n[aã]o permitido\b/i,
  },
  {
    id: '404',
    route: '* (qualquer outra)',
    label: 'Página não encontrada',
    match: /^p[aá]gina n[aã]o encontrada\b/i,
  },
];

/* ------------------------------------------------------------------------------------------------
 * Funções puras (testadas em test/plugin.test.mjs)
 * ---------------------------------------------------------------------------------------------- */

/** @param {number} value */
function channel(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** @param {{ r: number, g: number, b: number }} color */
function toHex(color) {
  return channel(color.r) + channel(color.g) + channel(color.b);
}

/** @param {string} hex @returns {RGB} */
function fromHex(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

/** @param {string} name */
function normalize(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** @param {string} name */
function isLibraryFrame(name) {
  return LIBRARY_FRAMES.map(normalize).indexOf(normalize(name)) !== -1;
}

/**
 * Compara os nomes dos frames do documento com as telas esperadas do frontend.
 * @param {string[]} frameNames
 */
function coverage(frameNames) {
  const present = [];
  const missing = [];
  for (const screen of EXPECTED_SCREENS) {
    const found = frameNames.filter((name) => screen.match.test(name.trim()));
    if (found.length > 0) present.push({ id: screen.id, label: screen.label, frames: found });
    else
      missing.push({
        id: screen.id,
        label: screen.label,
        route: screen.route,
        canCreate: screen.create !== undefined,
        frameName: screen.create || null,
      });
  }
  const unknown = frameNames.filter(
    (name) => !EXPECTED_SCREENS.some((screen) => screen.match.test(name.trim())),
  );
  return { present, missing, unknown };
}

/**
 * Decide o que fazer com uma pintura sólida.
 * @param {{ hex: string, boundName: string | null, info: boolean }} paint
 * @returns {{ action: 'none' | 'rebind' | 'bind', variable?: string, approximate?: boolean }}
 */
function planPaint(paint) {
  if (paint.boundName !== null) {
    if (paint.info && Object.prototype.hasOwnProperty.call(BRAND_TO_INFO, paint.boundName)) {
      return { action: 'rebind', variable: BRAND_TO_INFO[paint.boundName] };
    }
    return { action: 'none' };
  }
  const legacy = LEGACY_COLORS[paint.hex];
  if (legacy === undefined) return { action: 'none' };
  return {
    action: 'bind',
    variable: paint.info ? legacy.info : legacy.brand,
    approximate: !legacy.exact,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Execução no Figma
 * ---------------------------------------------------------------------------------------------- */

/** @typedef {{ level: 'erro' | 'aviso' | 'revisar', where: string, message: string }} Problem */

/** @type {Problem[]} */
let problems = [];
let cancelled = false;
/** Verdadeiro durante a aplicação (falso durante a análise). */
let applying = false;

/** @param {Problem['level']} level @param {string} where @param {string} message */
function report(level, where, message) {
  if (problems.length < 400) problems.push({ level, where, message });
}

/** @param {any} message */
function post(message) {
  figma.ui.postMessage(message);
}

/** @param {string} step @param {number} done @param {number} total @param {string} label */
function progress(step, done, total, label) {
  post({ type: 'progress', step, done, total, label });
}

/** Devolve o controle ao Figma entre lotes (mantém a interface responsiva). */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** @param {BaseNode} node */
function pathOf(node) {
  const names = [];
  /** @type {BaseNode | null} */
  let current = node;
  while (current !== null && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    names.unshift(current.name);
    current = current.parent;
  }
  return names.slice(0, 3).join(' › ') + (names.length > 3 ? ' › … › ' + node.name : '');
}

/** Frames de nível superior (e dentro de seções) de uma página. @param {PageNode} page */
function topFrames(page) {
  /** @type {FrameNode[]} */
  const frames = [];
  for (const child of page.children) {
    if (child.type === 'FRAME') frames.push(child);
    else if (child.type === 'SECTION') {
      for (const inner of child.children) if (inner.type === 'FRAME') frames.push(inner);
    }
  }
  return frames;
}

/** Contexto de variáveis da coleção FHDOD. */
async function loadVariables() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find((item) => item.name === COLLECTION_NAME) || null;
  /** @type {Record<string, Variable>} */
  const byName = {};
  /** @type {Record<string, string>} */
  const nameById = {};
  for (const variable of await figma.variables.getLocalVariablesAsync('COLOR')) {
    nameById[variable.id] = variable.name;
    if (collection !== null && variable.variableCollectionId === collection.id) {
      byName[variable.name] = variable;
    }
  }
  return { collection, byName, nameById };
}

/** @typedef {Awaited<ReturnType<typeof loadVariables>>} VariableContext */

/** Cache: o nó está num contexto semântico "informação"? */
/** @type {Map<string, boolean>} */
const infoCache = new Map();

/**
 * Componente variante (ou instância de uma) de Aviso/Etiqueta com variante "info".
 * @param {SceneNode} node
 */
async function isInfoContext(node) {
  /** @type {BaseNode | null} */
  let current = node;
  /** @type {string[]} */
  const visited = [];
  let result = false;
  while (current !== null && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    const cached = infoCache.get(current.id);
    if (cached !== undefined) {
      result = cached;
      break;
    }
    visited.push(current.id);
    if (
      current.type === 'COMPONENT' &&
      current.parent !== null &&
      current.parent.type === 'COMPONENT_SET'
    ) {
      if (SEMANTIC_SET.test(current.parent.name) && INFO_VARIANT.test(current.name)) {
        result = true;
        break;
      }
    } else if (current.type === 'INSTANCE') {
      const main = await current.getMainComponentAsync();
      if (main !== null && main.parent !== null && main.parent.type === 'COMPONENT_SET') {
        if (SEMANTIC_SET.test(main.parent.name) && INFO_VARIANT.test(main.name)) {
          result = true;
          break;
        }
      }
    }
    if (SEMANTIC_SET.test(current.name) && INFO_VARIANT.test(current.name)) {
      result = true;
      break;
    }
    current = current.parent;
  }
  for (const id of visited) infoCache.set(id, result);
  return result;
}

/** @param {SceneNode} node */
function isProtected(node) {
  /** @type {BaseNode | null} */
  let current = node;
  while (current !== null && current.type !== 'PAGE') {
    if (PROTECTED_NAME.test(current.name)) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Analisa (e, com `apply`, atualiza) as pinturas de um nó.
 * @param {SceneNode} node
 * @param {VariableContext} vars
 * @param {boolean} apply
 * @param {Stats} stats
 */
async function processNode(node, vars, apply, stats) {
  const protectedNode = isProtected(node);
  for (const prop of /** @type {const} */ (['fills', 'strokes'])) {
    if (!(prop in node)) continue;
    const target = /** @type {SceneNode & MinimalFillsMixin & MinimalStrokesMixin} */ (node);
    if (prop === 'fills' && target.fills === figma.mixed) {
      if (node.type === 'TEXT') await processMixedText(node, vars, apply, stats, protectedNode);
      continue;
    }
    const paints = /** @type {ReadonlyArray<Paint>} */ (target[prop]);
    if (!Array.isArray(paints) || paints.length === 0) continue;

    const styleKey = prop === 'fills' ? 'fillStyleId' : 'strokeStyleId';
    const styleId = /** @type {any} */ (node)[styleKey];
    if (typeof styleId === 'string' && styleId !== '') {
      const plan = await paintsPlan(paints, node, vars, stats, protectedNode);
      if (plan.changed) {
        await handleStyle(styleId, plan, node, vars, apply, stats);
      }
      continue;
    }

    const plan = await paintsPlan(paints, node, vars, stats, protectedNode);
    if (!plan.changed) continue;
    if (protectedNode) {
      stats.protectedHits++;
      report(
        'revisar',
        pathOf(node),
        'Elemento protegido (logo, imagem, QR Code ou ilustração) usa a paleta antiga; não foi alterado.',
      );
      continue;
    }
    if (apply) {
      try {
        if (node.type === 'TEXT' && node.hasMissingFont) {
          report('aviso', pathOf(node), 'Texto com fonte ausente; cor não alterada.');
          continue;
        }
        target[prop] = plan.paints;
        stats.changedPaints += plan.count;
        stats.touched.add(node.id);
      } catch (error) {
        report('erro', pathOf(node), 'Falha ao alterar ' + prop + ': ' + String(error));
      }
    } else {
      stats.pendingPaints += plan.count;
    }
  }

  if ('effects' in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (
        (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') &&
        LEGACY_COLORS[toHex(effect.color)] !== undefined
      ) {
        report(
          'revisar',
          pathOf(node),
          'Sombra com cor azul antiga (efeitos não são alterados automaticamente).',
        );
      }
    }
  }
}

/**
 * @param {ReadonlyArray<Paint>} paints
 * @param {SceneNode} node
 * @param {VariableContext} vars
 * @param {Stats} stats
 * @param {boolean} protectedNode
 */
async function paintsPlan(paints, node, vars, stats, protectedNode) {
  /** @type {Paint[]} */
  const next = [];
  let changed = false;
  let count = 0;
  let info = null;
  for (const paint of paints) {
    if (paint.type === 'IMAGE' || paint.type === 'VIDEO') {
      stats.images++;
      next.push(paint);
      continue;
    }
    if (paint.type !== 'SOLID') {
      if (paint.type.indexOf('GRADIENT') === 0 && 'gradientStops' in paint) {
        const legacy = paint.gradientStops.some(
          (stop) => LEGACY_COLORS[toHex(stop.color)] !== undefined,
        );
        if (legacy)
          report(
            'revisar',
            pathOf(node),
            'Gradiente com azul antigo (gradientes não são alterados automaticamente).',
          );
      }
      next.push(paint);
      continue;
    }
    const alias = paint.boundVariables && paint.boundVariables.color;
    let boundName = null;
    if (alias) {
      boundName = vars.nameById[alias.id] || null;
      if (boundName === null) {
        stats.remoteBindings++;
        if (LEGACY_COLORS[toHex(paint.color)] !== undefined) {
          report(
            'aviso',
            pathOf(node),
            'Cor ligada a variável de biblioteca externa; altere-a na biblioteca de origem.',
          );
        }
        next.push(paint);
        continue;
      }
      if (boundName.indexOf('marca/') === 0) stats.brandBound++;
    }
    if (info === null) info = protectedNode ? false : await isInfoContext(node);
    const plan = planPaint({ hex: toHex(paint.color), boundName, info });
    if (plan.action === 'none' || plan.variable === undefined) {
      next.push(paint);
      continue;
    }
    const variable = vars.byName[plan.variable];
    if (variable === undefined) {
      next.push(paint);
      if (applying) {
        // Na aplicação, sem a variável de destino nada é trocado (a etapa 1 a cria).
        report(
          'aviso',
          pathOf(node),
          'Variável "' +
            plan.variable +
            '" inexistente; pintura mantida. Execute a etapa de variáveis.',
        );
      } else {
        // Na análise, "informação/*" ainda pode não existir: conta como pendente.
        changed = true;
        count++;
      }
      continue;
    }
    if (plan.approximate)
      report(
        'revisar',
        pathOf(node),
        'Azul #' + toHex(paint.color) + ' substituído por aproximação (' + plan.variable + ').',
      );
    if (plan.action === 'rebind') stats.infoRebinds++;
    const base = /** @type {SolidPaint} */ ({
      type: 'SOLID',
      color: paint.color,
      opacity: paint.opacity === undefined ? 1 : paint.opacity,
      visible: paint.visible !== false,
      blendMode: paint.blendMode || 'NORMAL',
    });
    next.push(figma.variables.setBoundVariableForPaint(base, 'color', variable));
    changed = true;
    count++;
  }
  return { changed, count, paints: next };
}

/**
 * Texto com várias cores: trata cada trecho.
 * @param {TextNode} node @param {VariableContext} vars @param {boolean} apply @param {Stats} stats @param {boolean} protectedNode
 */
async function processMixedText(node, vars, apply, stats, protectedNode) {
  const segments = node.getStyledTextSegments(['fills']);
  let loaded = false;
  for (const segment of segments) {
    const plan = await paintsPlan(segment.fills, node, vars, stats, protectedNode);
    if (!plan.changed) continue;
    if (protectedNode) {
      stats.protectedHits++;
      continue;
    }
    if (!apply) {
      stats.pendingPaints += plan.count;
      continue;
    }
    try {
      if (node.hasMissingFont) {
        report('aviso', pathOf(node), 'Texto com fonte ausente; cor não alterada.');
        return;
      }
      if (!loaded) {
        const fonts = node.getRangeAllFontNames(0, node.characters.length);
        await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
        loaded = true;
      }
      node.setRangeFills(segment.start, segment.end, plan.paints);
      stats.changedPaints += plan.count;
      stats.touched.add(node.id);
    } catch (error) {
      report('erro', pathOf(node), 'Falha ao alterar trecho de texto: ' + String(error));
    }
  }
}

/** @type {Set<string>} */
const handledStyles = new Set();

/**
 * Pintura vinda de um estilo: atualiza o estilo local (uma vez) ou informa estilo remoto.
 * @param {string} styleId @param {{ paints: Paint[], count: number }} plan @param {SceneNode} node
 * @param {VariableContext} vars @param {boolean} apply @param {Stats} stats
 */
async function handleStyle(styleId, plan, node, vars, apply, stats) {
  if (handledStyles.has(styleId)) return;
  handledStyles.add(styleId);
  const style = await figma.getStyleByIdAsync(styleId);
  if (style === null || style.type !== 'PAINT') return;
  if (style.remote) {
    report(
      'aviso',
      pathOf(node),
      'Estilo de cor "' + style.name + '" vem de biblioteca externa; atualize-o na biblioteca.',
    );
    return;
  }
  if (!apply) {
    stats.pendingPaints += plan.count;
    return;
  }
  try {
    style.paints = plan.paints;
    stats.changedPaints += plan.count;
    void vars;
  } catch (error) {
    report('erro', 'Estilo ' + style.name, String(error));
  }
}

/**
 * @typedef {{
 *   nodes: number, images: number, brandBound: number, infoRebinds: number, pendingPaints: number,
 *   changedPaints: number, protectedHits: number, remoteBindings: number, touched: Set<string>
 * }} Stats
 */

/** @returns {Stats} */
function newStats() {
  return {
    nodes: 0,
    images: 0,
    brandBound: 0,
    infoRebinds: 0,
    pendingPaints: 0,
    changedPaints: 0,
    protectedHits: 0,
    remoteBindings: 0,
    touched: new Set(),
  };
}

/**
 * Percorre um frame em lotes.
 * @param {FrameNode} frame @param {VariableContext} vars @param {boolean} apply @param {string} step
 * @param {{ done: number, total: number }} counter
 */
async function processFrame(frame, vars, apply, step, counter) {
  const stats = newStats();
  applying = apply;
  /** @type {SceneNode[]} */
  const nodes = [frame];
  for (const node of frame.findAll(() => true)) nodes.push(node);
  for (let index = 0; index < nodes.length; index++) {
    if (cancelled) throw new Error('Execução cancelada pelo usuário.');
    const node = nodes[index];
    stats.nodes++;
    try {
      await processNode(node, vars, apply, stats);
    } catch (error) {
      report('erro', pathOf(node), String(error));
    }
    if (index % BATCH_SIZE === BATCH_SIZE - 1) {
      progress(
        step,
        counter.done,
        counter.total,
        frame.name + ' (' + (index + 1) + '/' + nodes.length + ')',
      );
      await tick();
    }
  }
  return stats;
}

/* ------------------------------------------------------------------------------------------------
 * Análise
 * ---------------------------------------------------------------------------------------------- */

async function collectFrames() {
  /** @type {{ page: PageNode, frame: FrameNode, library: boolean }[]} */
  const result = [];
  for (const page of figma.root.children) {
    await page.loadAsync();
    for (const frame of topFrames(page))
      result.push({ page, frame, library: isLibraryFrame(frame.name) });
  }
  return result;
}

/** @param {VariableContext} vars */
function variablesStatus(vars) {
  /** @type {{ name: string, current: string | null, target: string, status: string }[]} */
  const items = [];
  if (vars.collection === null) {
    report(
      'erro',
      'Variáveis',
      'Coleção "' +
        COLLECTION_NAME +
        '" não encontrada. As cores fixas ainda podem ser trocadas, mas sem variáveis.',
    );
    return items;
  }
  const modeId = vars.collection.defaultModeId;
  /** @type {Record<string, string>} */
  const all = Object.assign({}, VARIABLE_TARGETS, INFO_VARIABLES);
  for (const name of Object.keys(all)) {
    const variable = vars.byName[name];
    if (variable === undefined) {
      items.push({
        name,
        current: null,
        target: all[name],
        status: name in INFO_VARIABLES ? 'criar' : 'ausente',
      });
      if (!(name in INFO_VARIABLES))
        report('aviso', 'Variáveis', 'Variável "' + name + '" não existe na coleção; será criada.');
      continue;
    }
    const value = variable.valuesByMode[modeId];
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'VARIABLE_ALIAS'
    ) {
      items.push({ name, current: 'alias', target: all[name], status: 'alias' });
      report(
        'revisar',
        'Variáveis',
        '"' + name + '" é um alias de outra variável; não será alterada.',
      );
      continue;
    }
    const current =
      typeof value === 'object' && value !== null && 'r' in value ? toHex(value) : String(value);
    items.push({
      name,
      current,
      target: all[name],
      status: current === all[name] ? 'ok' : 'atualizar',
    });
  }
  return items;
}

async function analyze() {
  problems = [];
  cancelled = false;
  infoCache.clear();
  handledStyles.clear();
  const vars = await loadVariables();
  const variables = variablesStatus(vars);
  const frames = await collectFrames();
  const counter = { done: 0, total: frames.length };
  const screens = [];
  for (const item of frames) {
    progress('Análise', counter.done, counter.total, item.frame.name);
    const stats = await processFrame(item.frame, vars, false, 'Análise', counter);
    screens.push({
      id: item.frame.id,
      name: item.frame.name,
      page: item.page.name,
      library: item.library,
      nodes: stats.nodes,
      brandBound: stats.brandBound,
      pending: stats.pendingPaints,
      images: stats.images,
      marked: item.frame.getPluginData(MARK_KEY) === MARK_VALUE,
      created: item.frame.getPluginData(CREATED_KEY) !== '',
    });
    counter.done++;
    await tick();
  }
  const cover = coverage(frames.filter((item) => !item.library).map((item) => item.frame.name));
  for (const missing of cover.missing) {
    report(
      missing.canCreate ? 'aviso' : 'erro',
      'Cobertura',
      'Tela ausente no Figma: ' +
        missing.label +
        ' (' +
        missing.route +
        ')' +
        (missing.canCreate
          ? ' — pode ser criada pelo plugin.'
          : ' — o plugin não sabe montá-la; crie manualmente.'),
    );
  }
  for (const name of cover.unknown)
    report('revisar', 'Cobertura', 'Frame sem tela correspondente no frontend: "' + name + '".');
  progress('Análise', counter.total, counter.total, 'Concluída');
  return { variables, screens, coverage: cover, problems };
}

/* ------------------------------------------------------------------------------------------------
 * Atualização
 * ---------------------------------------------------------------------------------------------- */

/** Etapa 1: variáveis. @param {VariableContext} vars */
async function updateVariables(vars) {
  let created = 0;
  let updated = 0;
  if (vars.collection === null) return { created, updated };
  const collection = vars.collection;
  const modeId = collection.defaultModeId;
  /** @type {Record<string, string>} */
  const targets = Object.assign({}, INFO_VARIABLES, VARIABLE_TARGETS);
  for (const name of Object.keys(targets)) {
    const color = fromHex(targets[name]);
    const rgba = { r: color.r, g: color.g, b: color.b, a: 1 };
    let variable = vars.byName[name];
    try {
      if (variable === undefined) {
        variable = figma.variables.createVariable(name, collection, 'COLOR');
        variable.scopes = ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'];
        variable.description =
          name.indexOf('informação/') === 0
            ? 'Azul semântico de informação (avisos e etiquetas). Identidade FHDOD v2.'
            : 'Identidade FHDOD branco e vermelho.';
        vars.byName[name] = variable;
        vars.nameById[variable.id] = name;
        variable.setValueForMode(modeId, rgba);
        created++;
        continue;
      }
      const value = variable.valuesByMode[modeId];
      if (
        typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        value.type === 'VARIABLE_ALIAS'
      )
        continue;
      if (
        typeof value === 'object' &&
        value !== null &&
        'r' in value &&
        toHex(value) === targets[name]
      )
        continue;
      variable.setValueForMode(modeId, rgba);
      updated++;
    } catch (error) {
      report('erro', 'Variável ' + name, String(error));
    }
  }
  return { created, updated };
}

/**
 * Etapas 2 e 3: pinturas (componentes primeiro, para que as instâncias herdem).
 * @param {VariableContext} vars @param {boolean} includeLibrary @param {boolean} includeScreens
 */
async function updatePaints(vars, includeLibrary, includeScreens) {
  const frames = await collectFrames();
  const ordered = frames
    .filter((item) => item.library && includeLibrary)
    .concat(frames.filter((item) => !item.library && includeScreens));
  // Componentes soltos na página (fora dos frames de biblioteca) também são mestres.
  const counter = { done: 0, total: ordered.length };
  let screensUpdated = 0;
  let paints = 0;
  let rebinds = 0;
  const details = [];
  for (const item of ordered) {
    const isIcons = normalize(item.frame.name) === 'icones';
    if (isIcons) {
      // Ícones-mestre: só análise (nunca recoloridos automaticamente).
      const stats = await processFrame(item.frame, vars, false, 'Componentes', counter);
      if (stats.pendingPaints > 0)
        report(
          'revisar',
          item.frame.name,
          stats.pendingPaints + ' pintura(s) azul(is) em ícones-mestre; não alteradas.',
        );
      counter.done++;
      continue;
    }
    const step = item.library ? 'Componentes' : 'Telas';
    progress(step, counter.done, counter.total, item.frame.name);
    const stats = await processFrame(item.frame, vars, true, step, counter);
    paints += stats.changedPaints;
    rebinds += stats.infoRebinds;
    if (!item.library && (stats.touched.size > 0 || stats.brandBound > 0)) {
      screensUpdated++;
      item.frame.setPluginData(MARK_KEY, MARK_VALUE);
    }
    details.push({
      name: item.frame.name,
      changed: stats.changedPaints,
      viaVariables: stats.brandBound,
    });
    counter.done++;
    await tick();
  }
  return { screensUpdated, paints, rebinds, details };
}

/* ------------------------------------------------------------------------------------------------
 * Criação de telas ausentes (diálogos da TL16, reproduzidos do frontend)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Frame com auto layout ajustado ao conteúdo nos dois eixos e sem preenchimento.
 * (A API oficial não tem um atalho para isso; `figma.createFrame()` vem com fundo branco.)
 * @param {'HORIZONTAL' | 'VERTICAL'} direction @param {{ name?: string, itemSpacing?: number }} [props]
 */
function autoLayout(direction, props) {
  const frame = figma.createFrame();
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.fills = [];
  frame.clipsContent = false;
  if (props !== undefined) {
    if (props.name !== undefined) frame.name = props.name;
    if (props.itemSpacing !== undefined) frame.itemSpacing = props.itemSpacing;
  }
  return frame;
}

const FONT = {
  regular: { family: 'Inter', style: 'Regular' },
  medium: { family: 'Inter', style: 'Medium' },
  semibold: { family: 'Inter', style: 'Semi Bold' },
};

/** @typedef {{ vars: VariableContext, page: PageNode, textStyles: Record<string, TextStyle>, icons: Record<string, ComponentNode>, buttons: Record<string, ComponentNode | null> }} BuildContext */

/** @param {SolidPaint} paint @param {VariableContext} vars @param {string} name */
function bindPaint(paint, vars, name) {
  const variable = vars.byName[name];
  return variable === undefined
    ? paint
    : figma.variables.setBoundVariableForPaint(paint, 'color', variable);
}

/** Pintura sólida ligada a variável (com cor de reserva). @param {BuildContext} ctx @param {string} name @param {string} fallback @param {number} [opacity] */
function solid(ctx, name, fallback, opacity) {
  /** @type {SolidPaint} */
  const paint = {
    type: 'SOLID',
    color: fromHex(fallback),
    opacity: opacity === undefined ? 1 : opacity,
  };
  return bindPaint(paint, ctx.vars, name);
}

/**
 * @param {BuildContext} ctx @param {string} characters
 * @param {{ size?: number, weight?: 'regular' | 'medium' | 'semibold', color?: [string, string], style?: string, align?: 'LEFT' | 'CENTER', mono?: boolean }} [options]
 */
async function text(ctx, characters, options) {
  const opts = options || {};
  const node = figma.createText();
  const style = opts.style === undefined ? undefined : ctx.textStyles[opts.style];
  if (style !== undefined) {
    await figma.loadFontAsync(style.fontName);
    await node.setTextStyleIdAsync(style.id);
  } else {
    const font = FONT[opts.weight || 'regular'];
    await figma.loadFontAsync(font);
    node.fontName = font;
    node.fontSize = opts.size || 16;
    node.lineHeight = { unit: 'PIXELS', value: Math.round((opts.size || 16) * 1.5) };
  }
  node.characters = characters;
  const color = opts.color || ['neutro/900', '0f172a'];
  node.fills = [solid(ctx, color[0], color[1])];
  if (opts.align) node.textAlignHorizontal = opts.align;
  return node;
}

/** Texto que quebra linha ocupando a largura do pai (auto layout). @param {FrameNode} parent @param {TextNode} node */
function appendWrapping(parent, node) {
  parent.appendChild(node);
  node.layoutSizingHorizontal = 'FILL';
  node.textAutoResize = 'HEIGHT';
  return node;
}

/** @param {BuildContext} ctx @param {string} name @param {number} size */
function icon(ctx, name, size) {
  const component = ctx.icons[name];
  if (component === undefined) {
    const placeholder = figma.createFrame();
    placeholder.name = 'Ícone/' + name + ' (ausente)';
    placeholder.resize(size, size);
    placeholder.fills = [];
    report(
      'aviso',
      'Criação',
      'Componente "Ícone/' + name + '" não encontrado; espaço reservado no lugar.',
    );
    return placeholder;
  }
  const instance = component.createInstance();
  instance.resize(size, size);
  return instance;
}

/**
 * Botão: instância do componente "Botão" quando a variante é encontrada; senão, um frame equivalente.
 * @param {BuildContext} ctx @param {'primary' | 'secondary' | 'danger'} kind @param {string} label @param {string} [iconName]
 */
async function button(ctx, kind, label, iconName) {
  const component = ctx.buttons[kind];
  if (component !== null && component !== undefined && iconName === undefined) {
    const instance = component.createInstance();
    instance.name = 'Botão — ' + label;
    const labelNode = instance.findOne((node) => node.type === 'TEXT');
    if (labelNode !== null && labelNode.type === 'TEXT' && !labelNode.hasMissingFont) {
      const fonts = labelNode.getRangeAllFontNames(0, labelNode.characters.length);
      await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
      labelNode.characters = label;
      return instance;
    }
    instance.remove();
  }
  const frame = autoLayout('HORIZONTAL', { name: 'Botão — ' + label, itemSpacing: 8 });
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.minHeight = 44;
  frame.minWidth = 44;
  frame.cornerRadius = 8;
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  if (kind === 'secondary') {
    frame.fills = [solid(ctx, 'neutro/branco', 'ffffff')];
    frame.strokes = [solid(ctx, 'neutro/borda', '6b7280')];
    frame.strokeWeight = 1;
  } else {
    frame.fills = [
      kind === 'danger' ? solid(ctx, 'perigo/700', '991b1b') : solid(ctx, 'marca/700', 'c8102e'),
    ];
  }
  if (iconName !== undefined) frame.appendChild(icon(ctx, iconName, 16));
  const color = kind === 'secondary' ? ['neutro/900', '0f172a'] : ['neutro/branco', 'ffffff'];
  frame.appendChild(
    await text(ctx, label, { weight: 'medium', color: /** @type {[string, string]} */ (color) }),
  );
  return frame;
}

/** @param {BuildContext} ctx @param {string} label @param {string} value @param {{ select?: boolean, placeholder?: boolean }} [options] */
async function field(ctx, label, value, options) {
  const opts = options || {};
  const wrapper = autoLayout('VERTICAL', { name: 'Campo — ' + label, itemSpacing: 4 });
  wrapper.fills = [];
  wrapper.appendChild(await text(ctx, label, { weight: 'medium' }));
  const control = autoLayout('HORIZONTAL', {
    name: opts.select ? 'Seleção' : 'Entrada',
    itemSpacing: 8,
  });
  control.cornerRadius = 8;
  control.paddingLeft = 12;
  control.paddingRight = 12;
  control.minHeight = 44;
  control.counterAxisAlignItems = 'CENTER';
  control.fills = [solid(ctx, 'neutro/branco', 'ffffff')];
  control.strokes = [solid(ctx, 'neutro/borda', '6b7280')];
  control.strokeWeight = 1;
  wrapper.appendChild(control);
  control.layoutSizingHorizontal = 'FILL';
  const valueNode = await text(ctx, value, {
    color: opts.placeholder ? ['neutro/600', '475569'] : ['neutro/900', '0f172a'],
  });
  control.appendChild(valueNode);
  valueNode.layoutSizingHorizontal = 'FILL';
  if (opts.select) control.appendChild(icon(ctx, 'chevron-down', 20));
  return wrapper;
}

/**
 * Monta um diálogo (src/components/ui/Dialog.tsx) sobre uma cópia da tela de fundo.
 * @param {BuildContext} ctx @param {string} frameName @param {FrameNode | null} backdrop
 * @param {{ title: string, description: string, size: 'md' | 'lg' }} spec
 * @param {(body: FrameNode) => Promise<void>} fill
 */
async function dialogScreen(ctx, frameName, backdrop, spec, fill) {
  /** @type {FrameNode} */
  let screen;
  if (backdrop !== null) {
    screen = backdrop.clone();
    screen.setPluginData(MARK_KEY, MARK_VALUE);
  } else {
    screen = figma.createFrame();
    screen.resize(1440, 900);
    screen.fills = [solid(ctx, 'neutro/50', 'f8fafc')];
    report(
      'aviso',
      'Criação',
      'Tela de fundo TL16 não encontrada; diálogo criado sobre fundo neutro.',
    );
  }
  screen.name = frameName;
  screen.setPluginData(CREATED_KEY, PLUGIN_VERSION);
  screen.clipsContent = true;

  const overlay = figma.createRectangle();
  overlay.name = 'Sobreposição (slate-900/50)';
  screen.appendChild(overlay);
  if ('layoutPositioning' in overlay && screen.layoutMode !== 'NONE')
    overlay.layoutPositioning = 'ABSOLUTE';
  overlay.x = 0;
  overlay.y = 0;
  overlay.resize(screen.width, screen.height);
  overlay.fills = [solid(ctx, 'neutro/900', '0f172a', 0.5)];

  const panelWidth = spec.size === 'lg' ? 672 : 512;
  const panel = autoLayout('VERTICAL', { name: 'Diálogo — ' + spec.title, itemSpacing: 16 });
  screen.appendChild(panel);
  if (screen.layoutMode !== 'NONE') panel.layoutPositioning = 'ABSOLUTE';
  panel.paddingTop = 24;
  panel.paddingBottom = 24;
  panel.paddingLeft = 24;
  panel.paddingRight = 24;
  panel.cornerRadius = 16;
  panel.fills = [solid(ctx, 'neutro/branco', 'ffffff')];
  panel.effects = [
    {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 20 },
      radius: 25,
      spread: -5,
      visible: true,
      blendMode: 'NORMAL',
    },
    {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 8 },
      radius: 10,
      spread: -6,
      visible: true,
      blendMode: 'NORMAL',
    },
  ];
  // resize() fixa os dois eixos: a altura volta a acompanhar o conteúdo logo depois.
  panel.resize(panelWidth, panel.height);
  panel.counterAxisSizingMode = 'FIXED';
  panel.primaryAxisSizingMode = 'AUTO';

  const header = autoLayout('HORIZONTAL', { name: 'Cabeçalho do diálogo', itemSpacing: 16 });
  header.fills = [];
  panel.appendChild(header);
  header.layoutSizingHorizontal = 'FILL';
  const titles = autoLayout('VERTICAL', { name: 'Título e descrição', itemSpacing: 4 });
  titles.fills = [];
  header.appendChild(titles);
  titles.layoutSizingHorizontal = 'FILL';
  appendWrapping(titles, await text(ctx, spec.title, { size: 20, weight: 'semibold' }));
  appendWrapping(titles, await text(ctx, spec.description, { color: ['neutro/700', '334155'] }));
  const close = autoLayout('HORIZONTAL', { name: 'Fechar' });
  close.resize(44, 44);
  close.primaryAxisSizingMode = 'FIXED';
  close.counterAxisSizingMode = 'FIXED';
  close.primaryAxisAlignItems = 'CENTER';
  close.counterAxisAlignItems = 'CENTER';
  close.cornerRadius = 8;
  close.fills = [];
  close.appendChild(icon(ctx, 'x', 20));
  header.appendChild(close);

  const body = autoLayout('VERTICAL', { name: 'Conteúdo do diálogo', itemSpacing: 16 });
  body.fills = [];
  panel.appendChild(body);
  body.layoutSizingHorizontal = 'FILL';
  await fill(body);

  const viewport = Math.min(screen.height, 900);
  panel.x = Math.round((screen.width - panelWidth) / 2);
  panel.y = Math.max(32, Math.round((viewport - panel.height) / 2));
  return screen;
}

/** @param {BuildContext} ctx @param {FrameNode} body @param {SceneNode[]} buttons */
function actions(ctx, body, buttons) {
  const row = autoLayout('HORIZONTAL', { name: 'Ações', itemSpacing: 12 });
  row.fills = [];
  row.primaryAxisAlignItems = 'MAX';
  body.appendChild(row);
  row.layoutSizingHorizontal = 'FILL';
  for (const item of buttons) row.appendChild(item);
  void ctx;
  return row;
}

const FICTITIOUS_USER = 'Ana Paula Fictícia';

/** @type {Record<string, (ctx: BuildContext, name: string, backdrop: FrameNode | null) => Promise<FrameNode>>} */
const BUILDERS = {
  // UserFormDialog.tsx — cadastro (perfil ainda não escolhido).
  'TL16 – Novo usuário – Computador – Diálogo': (ctx, name, backdrop) =>
    dialogScreen(
      ctx,
      name,
      backdrop,
      {
        title: 'Novo usuário',
        description: 'A conta é criada com uma senha temporária, exibida uma única vez.',
        size: 'lg',
      },
      async (body) => {
        for (const node of [
          await field(ctx, 'Nome completo', ''),
          await field(ctx, 'E-mail', ''),
          await field(ctx, 'Perfil', 'Selecione…', { select: true, placeholder: true }),
        ]) {
          body.appendChild(node);
          node.layoutSizingHorizontal = 'FILL';
        }
        const row = actions(ctx, body, [
          await button(ctx, 'secondary', 'Cancelar'),
          await button(ctx, 'primary', 'Cadastrar usuário'),
        ]);
        row.paddingTop = 8;
      },
    ),
  // TemporaryPasswordDialog.tsx — senha fictícia.
  'TL16 – Senha temporária – Computador – Diálogo': (ctx, name, backdrop) =>
    dialogScreen(
      ctx,
      name,
      backdrop,
      {
        title: 'Senha temporária',
        description:
          'Entregue esta senha a ' +
          FICTITIOUS_USER +
          ' por um canal seguro. No primeiro acesso, a troca será obrigatória.',
        size: 'md',
      },
      async (body) => {
        const warning = autoLayout('HORIZONTAL', {
          name: 'Aviso — senha exibida uma vez',
          itemSpacing: 8,
        });
        warning.paddingTop = 12;
        warning.paddingBottom = 12;
        warning.paddingLeft = 12;
        warning.paddingRight = 12;
        warning.cornerRadius = 8;
        warning.fills = [{ type: 'SOLID', color: fromHex('fffbeb') }];
        warning.strokes = [{ type: 'SOLID', color: fromHex('d97706') }];
        warning.strokeLeftWeight = 4;
        warning.strokeTopWeight = 0;
        warning.strokeRightWeight = 0;
        warning.strokeBottomWeight = 0;
        body.appendChild(warning);
        warning.layoutSizingHorizontal = 'FILL';
        warning.appendChild(icon(ctx, 'triangle-alert', 20));
        const warningText = await text(
          ctx,
          'Anote ou copie agora: esta senha não será exibida novamente.',
          { color: ['', '451a03'] },
        );
        appendWrapping(warning, warningText);
        const output = autoLayout('HORIZONTAL', { name: 'Senha temporária (fictícia)' });
        output.paddingTop = 12;
        output.paddingBottom = 12;
        output.paddingLeft = 16;
        output.paddingRight = 16;
        output.cornerRadius = 8;
        output.primaryAxisAlignItems = 'CENTER';
        output.fills = [solid(ctx, 'neutro/100', 'f1f5f9')];
        body.appendChild(output);
        output.layoutSizingHorizontal = 'FILL';
        const code = await text(
          ctx,
          'Tmp-4821-Xq',
          ctx.textStyles['FHDOD/Código']
            ? { style: 'FHDOD/Código', align: 'CENTER' }
            : { size: 24, weight: 'medium', align: 'CENTER' },
        );
        output.appendChild(code);
        const status = figma.createFrame();
        status.name = 'Situação da cópia (vazia)';
        status.fills = [];
        body.appendChild(status);
        status.resize(10, 24);
        status.layoutSizingHorizontal = 'FILL';
        actions(ctx, body, [
          await button(ctx, 'secondary', 'Copiar senha', 'copy'),
          await button(ctx, 'primary', 'Concluir'),
        ]);
      },
    ),
  // UsersPage.tsx + ConfirmDialog.tsx — desativação (variante de perigo).
  'TL16 – Desativar usuário – Computador – Confirmação': (ctx, name, backdrop) =>
    dialogScreen(
      ctx,
      name,
      backdrop,
      {
        title: 'Desativar usuário',
        description:
          FICTITIOUS_USER +
          ' perderá o acesso imediatamente, inclusive nas sessões abertas. O histórico é mantido.',
        size: 'md',
      },
      async (body) => {
        actions(ctx, body, [
          await button(ctx, 'secondary', 'Cancelar'),
          await button(ctx, 'danger', 'Desativar'),
        ]);
      },
    ),
};

/** Escolhe a variante do componente "Botão" para um tipo. @param {ComponentSetNode | null} set @param {'primary' | 'secondary' | 'danger'} kind */
function pickButtonVariant(set, kind) {
  if (set === null) return null;
  const want = {
    primary: /prim[aá]rio|primary/i,
    secondary: /secund[aá]rio|secondary/i,
    danger: /perigo|danger|destrut/i,
  }[kind];
  const candidates = set.children.filter(
    (child) => child.type === 'COMPONENT' && want.test(child.name),
  );
  const calm = candidates.filter(
    (child) =>
      !/desabil|disabled|hover|foco|focus|pressionad|carregando/i.test(child.name) &&
      !/[ií]cone\s*=\s*(sim|true|com)/i.test(child.name),
  );
  const chosen = calm[0] || candidates[0];
  return chosen && chosen.type === 'COMPONENT' ? chosen : null;
}

/** @param {{ id: string, frameName: string | null }[]} missing */
async function createMissing(missing) {
  // Destino: a página da TL16 (tela de fundo dos diálogos); sem ela, a página atual.
  // clone() coloca a cópia em figma.currentPage; por isso cada tela é movida para `page` depois.
  /** @type {FrameNode | null} */
  let backdrop = null;
  let page = figma.currentPage;
  const existing = new Set();
  for (const p of figma.root.children) {
    await p.loadAsync();
    for (const frame of topFrames(p)) {
      existing.add(frame.name.trim());
      if (backdrop === null && /^tl16\s*[–-]\s*gest/i.test(frame.name)) {
        backdrop = frame;
        page = p;
      }
    }
  }
  // figma.createText() nasce com Inter Regular: a fonte precisa estar carregada.
  await figma.loadFontAsync(FONT.regular);
  const vars = await loadVariables();
  /** @type {Record<string, TextStyle>} */
  const textStyles = {};
  for (const style of await figma.getLocalTextStylesAsync()) textStyles[style.name] = style;
  /** @type {Record<string, ComponentNode>} */
  const icons = {};
  for (const component of page.findAllWithCriteria({ types: ['COMPONENT'] })) {
    if (component.name.indexOf('Ícone/') === 0)
      icons[component.name.slice('Ícone/'.length)] = component;
  }
  const buttonSet = /** @type {ComponentSetNode | null} */ (
    page.findOne((node) => node.type === 'COMPONENT_SET' && normalize(node.name) === 'botao')
  );
  /** @type {BuildContext} */
  const ctx = {
    vars,
    page,
    textStyles,
    icons,
    buttons: {
      primary: pickButtonVariant(buttonSet, 'primary'),
      secondary: pickButtonVariant(buttonSet, 'secondary'),
      danger: pickButtonVariant(buttonSet, 'danger'),
    },
  };
  if (buttonSet === null)
    report('aviso', 'Criação', 'Componente "Botão" não encontrado; botões criados como frames.');

  let right = 0;
  for (const child of page.children) right = Math.max(right, child.x + child.width);
  let x = right + 200;
  const y = backdrop !== null ? backdrop.y : 0;
  const created = [];
  let index = 0;
  for (const item of missing) {
    if (item.frameName === null) continue;
    index++;
    progress('Telas ausentes', index - 1, missing.length, item.frameName);
    if (existing.has(item.frameName)) {
      report('aviso', 'Criação', '"' + item.frameName + '" já existe; não foi duplicada.');
      continue;
    }
    const builder = BUILDERS[item.frameName];
    if (builder === undefined) continue;
    try {
      const screen = await builder(ctx, item.frameName, backdrop);
      if (screen.parent !== page) page.appendChild(screen);
      screen.x = x;
      screen.y = y;
      x += screen.width + 120;
      created.push({ id: screen.id, name: screen.name });
      existing.add(item.frameName);
    } catch (error) {
      report('erro', item.frameName, 'Falha ao criar a tela: ' + String(error));
    }
    await tick();
  }
  return created;
}

/* ------------------------------------------------------------------------------------------------
 * Orquestração e mensagens da interface
 * ---------------------------------------------------------------------------------------------- */

/** @param {{ variables: boolean, components: boolean, screens: boolean, create: boolean }} steps */
async function update(steps) {
  problems = [];
  cancelled = false;
  infoCache.clear();
  handledStyles.clear();
  const result = {
    variablesCreated: 0,
    variablesUpdated: 0,
    paintsChanged: 0,
    infoRebinds: 0,
    screensUpdated: 0,
    created: /** @type {{ id: string, name: string }[]} */ ([]),
    details: /** @type {any[]} */ ([]),
  };
  const vars = await loadVariables();

  if (steps.variables) {
    progress('Variáveis', 0, 1, COLLECTION_NAME);
    const changes = await updateVariables(vars);
    result.variablesCreated = changes.created;
    result.variablesUpdated = changes.updated;
    figma.commitUndo();
  } else if (vars.byName['informação/700'] === undefined) {
    report(
      'aviso',
      'Variáveis',
      'Etapa de variáveis desmarcada e "informação/*" não existe: avisos informativos não serão religados.',
    );
  }

  if (steps.components || steps.screens) {
    const paints = await updatePaints(vars, steps.components, steps.screens);
    result.paintsChanged = paints.paints;
    result.infoRebinds = paints.rebinds;
    result.screensUpdated = paints.screensUpdated;
    result.details = paints.details;
    figma.commitUndo();
  }

  if (steps.create) {
    const frames = await collectFrames();
    const cover = coverage(frames.filter((item) => !item.library).map((item) => item.frame.name));
    result.created = await createMissing(cover.missing.filter((item) => item.canCreate));
    for (const item of cover.missing.filter((entry) => !entry.canCreate)) {
      report('erro', 'Cobertura', 'Tela ausente que o plugin não sabe montar: ' + item.label + '.');
    }
    figma.commitUndo();
  }

  progress('Concluído', 1, 1, 'Atualização concluída');
  return Object.assign(result, { problems });
}

if (typeof figma !== 'undefined') {
  figma.showUI(__html__, {
    width: 440,
    height: 680,
    themeColors: true,
    title: 'FHDOD — Identidade visual',
  });
  post({
    type: 'ready',
    file: figma.root.name,
    version: PLUGIN_VERSION,
    pages: figma.root.children.length,
  });

  figma.ui.onmessage = async (/** @type {any} */ message) => {
    try {
      if (message.type === 'analyze') post({ type: 'analysis', data: await analyze() });
      else if (message.type === 'update')
        post({ type: 'result', data: await update(message.steps) });
      else if (message.type === 'cancel') cancelled = true;
      else if (message.type === 'focus') {
        const node = await figma.getNodeByIdAsync(message.id);
        if (node !== null && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
          /** @type {BaseNode | null} */
          let page = node;
          while (page !== null && page.type !== 'PAGE') page = page.parent;
          if (page !== null && page.type === 'PAGE' && page !== figma.currentPage)
            await figma.setCurrentPageAsync(page);
          figma.viewport.scrollAndZoomIntoView([/** @type {SceneNode} */ (node)]);
          figma.currentPage.selection = [/** @type {SceneNode} */ (node)];
        }
      } else if (message.type === 'close') figma.closePlugin();
    } catch (error) {
      post({
        type: 'error',
        message: String(
          error && /** @type {Error} */ (error).message
            ? /** @type {Error} */ (error).message
            : error,
        ),
        problems,
      });
    }
  };
} else {
  // Ambiente de teste (Node): expõe as funções puras.
  /** @type {any} */ (globalThis).fhdodPlugin = {
    toHex,
    fromHex,
    normalize,
    isLibraryFrame,
    coverage,
    planPaint,
    pickButtonVariant,
    VARIABLE_TARGETS,
    INFO_VARIABLES,
    LEGACY_COLORS,
    EXPECTED_SCREENS,
  };
}
