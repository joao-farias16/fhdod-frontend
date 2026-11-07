// Testes do plugin em Node, com uma simulação mínima da Plugin API do Figma.
// Não substituem a execução no Figma Desktop: verificam a lógica (análise, mapeamento de cores,
// religação de variáveis, proteção de imagens/ícones/QR Code, criação sem duplicar).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '..', 'code.js'), 'utf8');

const hex = (value) => ({
  r: parseInt(value.slice(0, 2), 16) / 255,
  g: parseInt(value.slice(2, 4), 16) / 255,
  b: parseInt(value.slice(4, 6), 16) / 255,
});
const toHex = (c) =>
  [c.r, c.g, c.b]
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

/** Simulação da Plugin API (somente o que o plugin usa). */
function createFigma() {
  let nextId = 1;
  const mixed = Symbol('mixed');
  const variables = new Map();
  const collection = {
    id: 'VariableCollectionId:1',
    name: 'FHDOD — Cores',
    defaultModeId: 'm1',
    modes: [{ modeId: 'm1', name: 'Claro' }],
  };

  function variable(name, value) {
    const v = {
      id: 'VariableID:' + nextId++,
      name,
      resolvedType: 'COLOR',
      variableCollectionId: collection.id,
      valuesByMode: { m1: { ...hex(value), a: 1 } },
      scopes: ['ALL_SCOPES'],
      description: '',
      setValueForMode(mode, val) {
        this.valuesByMode[mode] = val;
      },
    };
    variables.set(v.id, v);
    return v;
  }

  class Node {
    constructor(type, name, props = {}) {
      this.id = nextId++ + ':1';
      this.type = type;
      this.name = name;
      this.parent = null;
      this.x = 0;
      this.y = 0;
      this.width = 100;
      this.height = 100;
      this.layoutMode = 'NONE';
      this._data = {};
      if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION', 'PAGE'].includes(type))
        this.children = [];
      if (type !== 'PAGE' && type !== 'COMPONENT_SET') {
        this.fills = [];
        this.strokes = [];
        this.effects = [];
      }
      Object.assign(this, props);
    }
    appendChild(child) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
      child.parent = this;
      this.children.push(child);
    }
    remove() {
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    }
    findAll(predicate) {
      const out = [];
      const walk = (n) => {
        for (const c of n.children || []) {
          if (predicate(c)) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    }
    findOne(predicate) {
      return this.findAll(predicate)[0] || null;
    }
    findAllWithCriteria({ types }) {
      return this.findAll((n) => types.includes(n.type));
    }
    resize(w, h) {
      this.width = w;
      this.height = h;
    }
    getPluginData(key) {
      return this._data[key] || '';
    }
    setPluginData(key, value) {
      this._data[key] = value;
    }
    // Como na API real: a cópia (e a instância) nasce em figma.currentPage.
    clone(top = true) {
      const copy = new Node(this.type, this.name);
      for (const key of Object.keys(this)) {
        if (['id', 'parent', 'children', '_data'].includes(key)) continue;
        copy[key] = structuredClone(this[key]);
      }
      copy._main = this._main;
      for (const c of this.children || []) copy.appendChild(c.clone(false));
      if (top) figma.currentPage.appendChild(copy);
      return copy;
    }
    createInstance() {
      const inst = this.clone();
      inst.type = 'INSTANCE';
      inst._main = this;
      return inst;
    }
    async getMainComponentAsync() {
      return this._main || null;
    }
    async loadAsync() {}
    // Texto
    async setTextStyleIdAsync(id) {
      this.textStyleId = id;
    }
    getRangeAllFontNames() {
      return [this.fontName || { family: 'Inter', style: 'Regular' }];
    }
    getStyledTextSegments() {
      return this._segments || [];
    }
    setRangeFills(start, end, fills) {
      this._segments = this._segments.map((s) => (s.start === start ? { ...s, fills } : s));
    }
  }

  const page = new Node('PAGE', 'Page 1');
  const root = { name: 'sistema-hospital', children: [page] };
  const posted = [];
  const loadedFonts = [];

  const figma = {
    mixed,
    root,
    currentPage: page,
    ui: { postMessage: (m) => posted.push(m), onmessage: null },
    showUI() {},
    commitUndo() {},
    closePlugin() {},
    viewport: { scrollAndZoomIntoView() {} },
    async getNodeByIdAsync() {
      return null;
    },
    async setCurrentPageAsync() {},
    async loadFontAsync(font) {
      loadedFonts.push(font.style);
    },
    async getLocalTextStylesAsync() {
      return [];
    },
    async getStyleByIdAsync() {
      return null;
    },
    createFrame: () =>
      new Node('FRAME', 'Frame', { fills: [{ type: 'SOLID', color: hex('ffffff') }] }),
    createRectangle: () => new Node('RECTANGLE', 'Rectangle'),
    createText: () =>
      new Node('TEXT', 'Text', { characters: '', hasMissingFont: false, fontName: undefined }),
    variables: {
      async getLocalVariableCollectionsAsync() {
        return [collection];
      },
      async getLocalVariablesAsync() {
        return [...variables.values()];
      },
      createVariable(name) {
        return variable(name, '000000');
      },
      setBoundVariableForPaint(paint, field, v) {
        return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } };
      },
    },
  };

  // ----- Documento com a estrutura observada no arquivo real -----
  const V = {};
  for (const [name, value] of Object.entries({
    'marca/700': '1d4ed8',
    'marca/800': '1e40af',
    'marca/50': 'eff6ff',
    'marca/100': 'dbeafe',
    'marca/950': '172554',
    'perigo/700': 'b91c1c',
    'perigo/50': 'fef2f2',
    'perigo/900': '7f1d1d',
    'neutro/borda': '6b7280',
    'neutro/50': 'f8fafc',
    'neutro/100': 'f1f5f9',
    'neutro/600': '475569',
    'neutro/700': '334155',
    'neutro/900': '0f172a',
    'neutro/branco': 'ffffff',
  }))
    V[name] = variable(name, value);
  const bound = (name) => ({
    type: 'SOLID',
    color: hex(V[name].valuesByMode.m1.r !== undefined ? toHex(V[name].valuesByMode.m1) : '000000'),
    boundVariables: { color: { type: 'VARIABLE_ALIAS', id: V[name].id } },
  });
  const raw = (value) => ({ type: 'SOLID', color: hex(value) });

  const icons = new Node('FRAME', 'Ícones');
  page.appendChild(icons);
  for (const n of ['x', 'copy', 'triangle-alert', 'chevron-down', 'heart-pulse']) {
    const c = new Node('COMPONENT', 'Ícone/' + n);
    const vec = new Node('VECTOR', 'Vector', { strokes: [raw('1d4ed8')] }); // azul num ícone-mestre
    c.appendChild(vec);
    icons.appendChild(c);
  }

  const library = new Node('FRAME', 'Componentes');
  page.appendChild(library);
  const aviso = new Node('COMPONENT_SET', 'Aviso');
  library.appendChild(aviso);
  const avisoInfo = new Node('COMPONENT', 'Tom=info', {
    fills: [bound('marca/50')],
    strokes: [bound('marca/700')],
  });
  const avisoInfoText = new Node('TEXT', 'Mensagem', {
    fills: [bound('marca/950')],
    characters: 'Info',
    hasMissingFont: false,
  });
  avisoInfo.appendChild(avisoInfoText);
  const avisoErro = new Node('COMPONENT', 'Tom=erro', {
    fills: [bound('perigo/50')],
    strokes: [bound('perigo/700')],
  });
  aviso.appendChild(avisoInfo);
  aviso.appendChild(avisoErro);
  const botao = new Node('COMPONENT_SET', 'Botão');
  library.appendChild(botao);
  for (const variant of ['Primário', 'Secundário', 'Perigo']) {
    const comp = new Node('COMPONENT', 'Variante=' + variant + ', Estado=Padrão', {
      fills: [
        bound(
          variant === 'Perigo'
            ? 'perigo/700'
            : variant === 'Primário'
              ? 'marca/700'
              : 'neutro/branco',
        ),
      ],
    });
    comp.appendChild(new Node('TEXT', 'Rótulo', { characters: 'Botão', hasMissingFont: false }));
    botao.appendChild(comp);
  }

  const screen = (name) => {
    const frame = new Node('FRAME', name, { width: 1440, height: 1200, fills: [raw('f8fafc')] });
    page.appendChild(frame);
    return frame;
  };
  const tl01 = screen('TL01 – Login – Computador – Erro de credenciais');
  const header = new Node('FRAME', 'Cabeçalho', { fills: [bound('marca/700')] });
  tl01.appendChild(header);
  const sub = new Node('TEXT', 'Área administrativa', {
    fills: [raw('dbeafe')],
    characters: 'Área administrativa',
    hasMissingFont: false,
  });
  header.appendChild(sub);
  const link = new Node('TEXT', 'Link', {
    fills: [raw('1d4ed8')],
    characters: 'Esqueci',
    hasMissingFont: false,
  });
  tl01.appendChild(link);
  const photo = new Node('RECTANGLE', 'Foto', {
    fills: [{ type: 'IMAGE', imageHash: 'abc', scaleMode: 'FILL' }],
  });
  tl01.appendChild(photo);
  const infoInstance = avisoInfo.createInstance();
  infoInstance.fills = [bound('marca/50')]; // sobreposição na instância
  tl01.appendChild(infoInstance);
  const mixedText = new Node('TEXT', 'Texto misto', {
    fills: mixed,
    characters: 'ab',
    hasMissingFont: false,
  });
  mixedText._segments = [
    { start: 0, end: 1, fills: [raw('0f172a')] },
    { start: 1, end: 2, fills: [raw('1e40af')] },
  ];
  tl01.appendChild(mixedText);

  const poster = screen('TL08 – Cartaz A4 do QR Code – Impressão – Padrão');
  const qr = new Node('FRAME', 'QR Code (ilustrativo, 360 px)', { fills: [raw('1d4ed8')] });
  poster.appendChild(qr);

  for (const name of [
    'TL02 – Troca obrigatória de senha – Computador – Validação',
    'TL16 – Gestão de usuários – Computador – Lista',
    'TL17 – Auditoria – Computador – Padrão',
    'Acesso não permitido – Computador – Visualizador',
    'TL05 – Setores e equipes – Computador – Padrão',
    'TL06 – Escala e turnos – Computador – Padrão',
    'TL07 – Importação de escalas – Computador – Arquivo validado',
    'TL08 – Pesquisas – Computador – Lista',
    'TL08 – Configuração de pesquisa – Computador – Publicada',
    'Início – Computador – Padrão',
    'Página não encontrada – Computador – Padrão',
    'TL09 – Pesquisa pública – Celular – Pergunta geral',
    'TL11 – Confirmação – Celular – Oferta após nota baixa',
    'TL10 – Manifestação – Celular – Contato informado',
    'TL03 – Dashboard geral – Computador – Padrão',
    'TL04 – Dashboard por setor – Computador – Padrão',
    'TL12 – Lista de manifestações – Computador – Padrão',
    'TL13 – Detalhes da manifestação – Computador – Em análise',
    'TL14 – Exportação de relatórios – Computador – Ouvidoria',
  ])
    screen(name);

  return {
    figma,
    posted,
    V,
    nodes: {
      icons,
      avisoInfo,
      avisoInfoText,
      avisoErro,
      header,
      sub,
      link,
      photo,
      infoInstance,
      mixedText,
      qr,
      page,
    },
    loadedFonts,
  };
}

function load() {
  const env = createFigma();
  const context = vm.createContext({
    figma: env.figma,
    __html__: '<html></html>',
    setTimeout,
    console,
  });
  vm.runInContext(source, context);
  const call = async (message) => {
    env.posted.length = 0;
    await env.figma.ui.onmessage(message);
    const reply = env.posted.find((m) => ['analysis', 'result', 'error'].includes(m.type));
    if (reply && reply.type === 'error') throw new Error('Plugin: ' + reply.message);
    return reply;
  };
  return { ...env, call };
}

// Objetos criados dentro do vm têm outro protótipo: compara o conteúdo.
const same = (actual, expected, message) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message);

const ALL = { variables: true, components: true, screens: true, create: true };

test('funções puras: cores, cobertura e plano de pintura', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const p = context.fhdodPlugin;
  assert.equal(p.toHex(p.fromHex('c8102e')), 'c8102e');
  assert.equal(p.isLibraryFrame('Ícones'), true);
  assert.equal(p.isLibraryFrame('Componentes'), true);
  assert.equal(p.isLibraryFrame('TL01 – Login'), false);
  same(p.planPaint({ hex: '1d4ed8', boundName: null, info: false }), {
    action: 'bind',
    variable: 'marca/700',
    approximate: false,
  });
  same(p.planPaint({ hex: '1d4ed8', boundName: null, info: true }), {
    action: 'bind',
    variable: 'informação/700',
    approximate: false,
  });
  same(p.planPaint({ hex: '1d4ed8', boundName: 'marca/700', info: true }), {
    action: 'rebind',
    variable: 'informação/700',
  });
  same(p.planPaint({ hex: '1d4ed8', boundName: 'marca/700', info: false }), { action: 'none' });
  same(p.planPaint({ hex: '15803d', boundName: null, info: false }), { action: 'none' });
  // Os valores do plugin coincidem com os tokens do frontend.
  const css = readFileSync(resolve(here, '..', '..', 'src', 'styles', 'index.css'), 'utf8');
  for (const [token, variable] of [
    ['brand-50', 'marca/50'],
    ['brand-100', 'marca/100'],
    ['brand-700', 'marca/700'],
    ['brand-800', 'marca/800'],
    ['danger-700', 'perigo/700'],
    ['danger-800', 'perigo/900'],
  ]) {
    const match = css.match(new RegExp('--color-' + token + ':\\s*#([0-9a-f]{6})'));
    assert.ok(match, token);
    assert.equal(p.VARIABLE_TARGETS[variable], match[1], token + ' ↔ ' + variable);
  }
  for (const [token, variable] of [
    ['info-50', 'informação/50'],
    ['info-700', 'informação/700'],
    ['info-800', 'informação/800'],
    ['info-950', 'informação/950'],
  ]) {
    const match = css.match(new RegExp('--color-' + token + ':\\s*#([0-9a-f]{6})'));
    assert.equal(p.INFO_VARIABLES[variable], match[1], token + ' ↔ ' + variable);
  }
});

test('cobertura: as rotas do frontend correspondem aos frames do arquivo', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const p = context.fhdodPlugin;
  const result = p.coverage([
    'TL01 – Login – Computador – Erro',
    'Início – Computador – Padrão',
    'Rascunho solto',
  ]);
  assert.ok(result.present.some((s) => s.id === 'tl01'));
  assert.ok(result.missing.some((s) => s.id === 'tl17'));
  same(result.unknown, ['Rascunho solto']);
  assert.equal(result.missing.filter((s) => s.canCreate).length, 3);
});

test('análise não altera o documento e aponta pendências e telas ausentes', async () => {
  const env = load();
  const before = JSON.stringify(env.nodes.link.fills) + env.V['marca/700'].valuesByMode.m1.r;
  const { data } = await env.call({ type: 'analyze' });
  assert.equal(JSON.stringify(env.nodes.link.fills) + env.V['marca/700'].valuesByMode.m1.r, before);
  assert.equal(data.screens.filter((s) => !s.library).length, 21);
  same(
    data.coverage.missing.map((m) => m.id),
    ['tl16-novo', 'tl16-senha', 'tl16-desativar'],
  );
  assert.ok(data.variables.some((v) => v.name === 'marca/700' && v.status === 'atualizar'));
  assert.ok(data.variables.some((v) => v.name === 'informação/700' && v.status === 'criar'));
  const tl01 = data.screens.find((s) => s.name.startsWith('TL01'));
  assert.ok(tl01.pending >= 3, 'cabeçalho, link e trecho de texto pendentes');
  assert.equal(tl01.images, 1);
  assert.ok(
    data.problems.some((p) => /protegido/.test(p.message)),
    'QR Code sinalizado',
  );
});

test('atualização: variáveis, religação semântica, cores fixas e proteções', async () => {
  const env = load();
  await env.call({ type: 'analyze' });
  const { data } = await env.call({ type: 'update', steps: ALL });
  const { V, nodes } = env;

  // 1. Variáveis
  assert.equal(toHex(V['marca/700'].valuesByMode.m1), 'c8102e');
  assert.equal(toHex(V['marca/800'].valuesByMode.m1), 'a50d26');
  assert.equal(toHex(V['marca/50'].valuesByMode.m1), 'fdf2f4');
  assert.equal(toHex(V['perigo/700'].valuesByMode.m1), '991b1b');
  assert.equal(toHex(V['neutro/borda'].valuesByMode.m1), '6b7280', 'neutros intactos');
  assert.equal(data.variablesCreated, 5);
  const vars = await env.figma.variables.getLocalVariablesAsync();
  const info700 = vars.find((v) => v.name === 'informação/700');
  assert.equal(toHex(info700.valuesByMode.m1), '1d4ed8');
  assert.ok(!info700.scopes.includes('ALL_SCOPES'), 'escopos explícitos');
  const nameById = Object.fromEntries(vars.map((v) => [v.id, v.name]));
  const boundName = (paint) => nameById[paint.boundVariables?.color?.id];

  // 2. Aviso "info" continua azul (religado); aviso de erro intacto
  assert.equal(boundName(nodes.avisoInfo.fills[0]), 'informação/50');
  assert.equal(boundName(nodes.avisoInfo.strokes[0]), 'informação/700');
  assert.equal(boundName(nodes.avisoInfoText.fills[0]), 'informação/950');
  assert.equal(
    boundName(nodes.infoInstance.fills[0]),
    'informação/50',
    'instância segue a semântica',
  );
  assert.equal(boundName(nodes.avisoErro.strokes[0]), 'perigo/700');

  // 3. Cores fixas ligadas à marca
  assert.equal(boundName(nodes.header.fills[0]), 'marca/700', 'já ligado: só muda pelo valor');
  assert.equal(boundName(nodes.link.fills[0]), 'marca/700');
  assert.equal(boundName(nodes.sub.fills[0]), 'marca/100');
  assert.equal(boundName(nodes.mixedText._segments[1].fills[0]), 'marca/800');
  assert.equal(
    nodes.mixedText._segments[0].fills[0].boundVariables,
    undefined,
    'trecho neutro intacto',
  );

  // Proteções
  assert.equal(nodes.photo.fills[0].type, 'IMAGE');
  assert.equal(toHex(nodes.qr.fills[0].color), '1d4ed8', 'QR Code não alterado');
  assert.equal(nodes.qr.fills[0].boundVariables, undefined);
  const iconVector = nodes.icons.children[0].children[0];
  assert.equal(iconVector.strokes[0].boundVariables, undefined, 'ícones-mestre não alterados');

  assert.ok(data.screensUpdated >= 1);
  assert.equal(
    data.problems.filter((p) => p.level === 'erro').length,
    0,
    JSON.stringify(data.problems),
  );
});

test('criação das telas ausentes e idempotência', async () => {
  const env = load();
  const first = (await env.call({ type: 'update', steps: ALL })).data;
  same(
    first.created.map((c) => c.name),
    [
      'TL16 – Novo usuário – Computador – Diálogo',
      'TL16 – Senha temporária – Computador – Diálogo',
      'TL16 – Desativar usuário – Computador – Confirmação',
    ],
  );
  const page = env.nodes.page;
  const dialog = page.children.find(
    (n) => n.name === 'TL16 – Desativar usuário – Computador – Confirmação',
  );
  const texts = dialog.findAll((n) => n.type === 'TEXT').map((n) => n.characters);
  assert.ok(texts.includes('Desativar usuário'));
  assert.ok(texts.includes('Cancelar'));
  assert.ok(texts.includes('Desativar'));
  const danger = dialog.findOne((n) => n.name === 'Botão — Desativar');
  assert.ok(danger, 'botão de perigo');
  assert.ok(env.loadedFonts.length > 0, 'fontes carregadas antes de editar textos');
  const novo = page.children.find((n) => n.name.startsWith('TL16 – Novo usuário'));
  const labels = novo.findAll((n) => n.type === 'TEXT').map((n) => n.characters);
  for (const label of [
    'Novo usuário',
    'Nome completo',
    'E-mail',
    'Perfil',
    'Selecione…',
    'Cadastrar usuário',
  ])
    assert.ok(labels.includes(label), label);
  // Sem sobreposição com as telas existentes
  const others = page.children.filter((n) => !first.created.some((c) => c.id === n.id));
  const right = Math.max(...others.map((n) => n.x + n.width));
  for (const c of first.created) assert.ok(page.children.find((n) => n.id === c.id).x > right);

  const count = page.children.length;
  const second = (await env.call({ type: 'update', steps: ALL })).data;
  assert.equal(second.created.length, 0, 'não duplica');
  assert.equal(page.children.length, count);
  assert.equal(second.variablesCreated, 0);
  assert.equal(second.variablesUpdated, 0);
});
