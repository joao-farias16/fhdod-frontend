/**
 * TL15 — TV Wall (ET10) ponta a ponta, com a API e o banco de TESTE reais. A API dos testes exibe
 * o hospital exclusivo da TV Wall criado pelo e2e:fixture (TV_WALL_HOSPITAL_SHORT_NAME), que
 * começa sem respostas e só é respondido por esta spec — as contagens são exatas:
 * T30 — sem respostas (NPS nunca 0); total com 4 respostas suprimido e setor com 4 ausente; com a
 *       5ª, total e setor presentes; outro setor com 4 ausente (RF60, RF71), relógio + 60 s.
 * T29 — /tv pública: tráfego só para o E42, sem token nem cookies, JSON pela lista de campos,
 *       sem links nem dados pessoais, valores iguais aos do E42 (RF68, RF72).
 * T31 — nova resposta visível com relógio + 60 s; API indisponível → aviso com os últimos dados;
 *       recuperação; recarga após 6 h; medidas no DOM em 1920 × 1080: tamanhos, contraste 7:1 e
 *       sem rolagem (RF69, RF70). A leitura física a 3 m é verificação manual, fora daqui.
 * Os casos que gravam respostas rodam só no projeto tv-1920 (nesta ordem); o T29 roda também em
 * 1440 e 360 px, sem gravar nada.
 */
import { randomUUID } from 'node:crypto';

import { type APIRequestContext, expect, type Page, test, type TestInfo } from '@playwright/test';

import { API_URL, capture, expectNoHorizontalScroll, readFixture } from './support';

const { tvWall } = readFixture();
const { primary: PA, secondary: UTI } = tvWall.sectors;
const SUMMARY_PATH = '/api/v1/tv-wall/summary';
const STAGE = 'ET10-ET11';

/** Lista de campos permitidos do E42 (docs/tv-wall.md da API; Seção 10: "campos por lista"). */
const ALLOWED_PATHS = new Set([
  'period',
  'period.key',
  'period.from',
  'period.to',
  'generatedAt',
  'suppressionThreshold',
  'overall',
  'overall.n',
  'overall.nps',
  'overall.promotersPercent',
  'overall.detractorsPercent',
  'overall.suppressed',
  'trend',
  'trend.granularity',
  'trend.points',
  'trend.points[]',
  'trend.points[].start',
  'trend.points[].end',
  'trend.points[].n',
  'trend.points[].nps',
  'trend.points[].suppressed',
  'sectors',
  'sectors[]',
  'sectors[].name',
  'sectors[].n',
  'sectors[].nps',
  'sectors[].promotersPercent',
  'sectors[].detractorsPercent',
]);

interface Summary {
  generatedAt: string;
  overall: {
    n: number | null;
    nps: number | null;
    promotersPercent: number | null;
    detractorsPercent: number | null;
    suppressed: boolean;
  };
  sectors: { name: string; n: number; nps: number }[];
}

function jsonPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return [prefix, ...value.flatMap((item) => jsonPaths(item, `${prefix}[]`))];
  }
  if (typeof value === 'object' && value !== null) {
    return [
      ...(prefix === '' ? [] : [prefix]),
      ...Object.entries(value).flatMap(([key, item]) =>
        jsonPaths(item, prefix === '' ? key : `${prefix}.${key}`),
      ),
    ];
  }
  return [prefix];
}

/** Mesmo formato da tela: pt-BR, uma casa no máximo, sinal de menos tipográfico. */
function fmt(value: number, digits = 1): string {
  return value
    .toLocaleString('pt-BR', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
      maximumFractionDigits: digits,
    })
    .replace(/^-/, '−');
}

async function e42(request: APIRequestContext): Promise<Summary> {
  const response = await request.get(`${API_URL}${SUMMARY_PATH}?period=30d`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: Summary }).data;
}

/** Registra uma avaliação pela API pública (E01 + E02), como o celular do paciente faria. */
async function respond(request: APIRequestContext, slug: string, npsScore: number) {
  const survey = await request.get(`${API_URL}/api/v1/public/surveys/${slug}`);
  expect(survey.status()).toBe(200);
  const { surveyVersionId } = ((await survey.json()) as { data: { surveyVersionId: string } }).data;
  const response = await request.post(`${API_URL}/api/v1/public/responses`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: { surveyVersionId, origin: 'link', npsScore, answers: [] },
  });
  expect(response.status()).toBe(201);
}

/** Erros de console e da página; `allow` aceita os provocados de propósito (API derrubada). */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return {
    expectClean(allow?: RegExp) {
      expect(errors.filter((text) => allow === undefined || !allow.test(text))).toEqual([]);
    },
  };
}

async function openTv(page: Page) {
  const summary = page.waitForResponse(
    (response) => response.url().includes(SUMMARY_PATH) && response.status() === 200,
  );
  await page.goto('/tv');
  const body = (await (await summary).json()) as { data: Summary };
  await expect(page.locator('[data-tv-value="nps"]')).toBeVisible();
  return body.data;
}

/** Avança o relógio do navegador e espera a consulta do E42 que ele provoca. */
async function nextCycle(page: Page, ms = 60_000) {
  const response = page.waitForResponse((r) => r.url().includes(SUMMARY_PATH));
  await page.clock.fastForward(ms);
  await response;
}

async function expectScreenMatches(page: Page, summary: Summary) {
  const { overall } = summary;
  if (overall.nps !== null) {
    await expect(page.locator('[data-tv-value="nps"]')).toHaveText(fmt(overall.nps));
  }
  if (overall.n !== null) {
    await expect(page.locator('[data-tv-value="n"]')).toHaveText(fmt(overall.n, 0));
  }
  for (const [key, value] of [
    ['promoters', overall.promotersPercent],
    ['detractors', overall.detractorsPercent],
  ] as const) {
    await expect(page.locator(`[data-tv-value="${key}"]`)).toHaveText(
      value === null ? '—' : `${fmt(value)}%`,
    );
  }
  await expect(page.locator('[data-tv-sector]')).toHaveText(summary.sectors.map((s) => s.name));
  await expect(page.locator('[data-tv-value="sector-nps"]')).toHaveText(
    summary.sectors.map((s) => fmt(s.nps)),
  );
}

function onlyTv(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'tv-1920', 'Grava respostas: roda uma vez, na TV.');
}

test.describe.configure({ mode: 'serial' });

test('T30 — sem respostas; total e setor com 4 suprimidos; com 5, presentes (relógio + 60 s)', async ({
  page,
  request,
}, testInfo) => {
  onlyTv(testInfo);
  const consoleErrors = watchConsole(page);
  await page.clock.install();

  // Hospital sem respostas: n = 0, sem NPS (nunca 0) e sem setores (RF60).
  const empty = await openTv(page);
  expect(empty.overall).toEqual({
    n: 0,
    nps: null,
    promotersPercent: null,
    detractorsPercent: null,
    suppressed: false,
  });
  await expect(page.locator('[data-tv-value="nps"]')).toHaveText('Sem respostas no período');
  await expect(page.locator('[data-tv-value="n"]')).toHaveText('0');
  await expect(page.getByText('Nenhuma resposta no período.')).toBeVisible();
  await capture(page, testInfo, 'TL15-sem-respostas', STAGE);

  // 4 respostas na UTI: total geral 4 → suprimido; setor com 4 → ausente (RF71).
  for (const score of [10, 10, 9, 7]) await respond(request, tvWall.surveys.secondary, score);
  const four = await e42(request);
  expect(four.overall).toEqual({
    n: null,
    nps: null,
    promotersPercent: null,
    detractorsPercent: null,
    suppressed: true,
  });
  expect(four.sectors).toEqual([]);
  await nextCycle(page);
  await expect(page.locator('[data-tv-value="nps"]')).toHaveText('Menos de 5 respostas');
  await expect(page.locator('[data-tv-value="n"]')).toHaveCount(0);
  await expect(page.locator('[data-tv-value="promoters"]')).toHaveText('—');
  await expect(page.locator('[data-tv-sector]')).toHaveCount(0);
  await expect(page.getByText('Nenhum setor com 5 respostas ou mais no período.')).toBeVisible();
  await capture(page, testInfo, 'TL15-total-suprimido', STAGE);

  // 5ª resposta: total e setor aparecem (n = 5; NPS = (3 − 1) / 5 = 40).
  await respond(request, tvWall.surveys.secondary, 3);
  const five = await e42(request);
  expect(five.overall).toEqual({
    n: 5,
    nps: 40,
    promotersPercent: 60,
    detractorsPercent: 20,
    suppressed: false,
  });
  expect(five.sectors).toEqual([
    { name: UTI, n: 5, nps: 40, promotersPercent: 60, detractorsPercent: 20 },
  ]);
  await nextCycle(page);
  await expectScreenMatches(page, five);
  const row = page.getByRole('row', { name: new RegExp(UTI) });
  await expect(row).toContainText('5 respostas');
  await expect(row).toContainText('40');

  // Outro setor com 4 respostas: continua fora da lista, sem nenhuma pista na tela.
  for (const score of [10, 6, 8, 9]) await respond(request, tvWall.surveys.primary, score);
  const partial = await e42(request);
  expect(partial.overall.n).toBe(9);
  expect(partial.sectors.map((s) => s.name)).toEqual([UTI]);
  await nextCycle(page);
  await expectScreenMatches(page, partial);
  await expect(page.locator(`[data-tv-sector="${PA}"]`)).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(PA);
  await expect(page.getByText(/Setores com menos de 5 respostas não aparecem/)).toBeVisible();
  await capture(page, testInfo, 'TL15-setor-com-4-ausente', STAGE);
  consoleErrors.expectClean();
});

test('T29 — /tv pública: só agregados do E42, sem links nem dados pessoais', async ({
  page,
  request,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const requests: { url: string; method: string; headers: Record<string, string> }[] = [];
  page.on('request', (r) => {
    requests.push({ url: r.url(), method: r.method(), headers: r.headers() });
  });

  const shown = await openTv(page);

  // Tráfego: a única chamada à API é o E42, sem Authorization e sem cookies.
  const apiCalls = requests.filter((r) => r.url.startsWith(API_URL));
  expect(apiCalls.map((r) => `${r.method} ${r.url.slice(API_URL.length)}`)).toEqual([
    `GET ${SUMMARY_PATH}?period=30d`,
  ]);
  for (const call of apiCalls) {
    expect(call.headers.authorization).toBeUndefined();
    expect(call.headers.cookie).toBeUndefined();
  }
  expect(await page.context().cookies()).toEqual([]);

  // JSON pela lista de campos permitidos (RF72).
  expect(jsonPaths(shown).filter((path) => !ALLOWED_PATHS.has(path))).toEqual([]);

  // Nenhum link, menu, botão ou campo; nenhum dado pessoal, protocolo, equipe ou turno.
  // (no <body>: o <head> tem o <link rel="icon" href>, que não é navegável).
  await expect(
    page.locator('body').locator('a, [href], nav, button, form, input, select, textarea'),
  ).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // e-mail
  expect(text).not.toMatch(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/); // telefone
  expect(text).not.toMatch(/FHD-\d{4}-\d{6}/); // protocolo
  expect(text).not.toMatch(/equipe|turno|manhã|tarde|noite|Ouvidoria|Sair|Entrar/i);

  // Valores iguais aos do E42 (RF68): o recebido pela página e uma consulta direta.
  await expectScreenMatches(page, shown);
  const direct = await e42(request);
  expect(direct.overall).toEqual(shown.overall);

  await expectNoHorizontalScroll(page);
  await capture(page, testInfo, 'TL15-tv-wall', STAGE);
  consoleErrors.expectClean();
});

test('T31 — nova resposta em 60 s; API fora: aviso com os últimos dados; volta; recarga de 6 h', async ({
  page,
  request,
}, testInfo) => {
  onlyTv(testInfo);
  const consoleErrors = watchConsole(page);
  await page.clock.install();
  const before = await openTv(page);
  expect(before.overall.n).not.toBeNull();

  // Nova resposta → aparece na próxima consulta (até 60 s; RF69 exige até 2 min). É a 5ª do
  // Pronto Atendimento: o setor passa a aparecer.
  await respond(request, tvWall.surveys.primary, 10);
  await nextCycle(page);
  const updated = await e42(request);
  expect(updated.overall.n).toBe((before.overall.n ?? 0) + 1);
  expect(updated.sectors.map((s) => s.name)).toContain(PA);
  await expectScreenMatches(page, updated);

  // API indisponível (conexão recusada): últimos dados mantidos e aviso visível.
  const npsText = await page.locator('[data-tv-value="nps"]').textContent();
  await page.route(`**${SUMMARY_PATH}**`, (route) => route.abort('connectionrefused'));
  await page.clock.fastForward(60_000);
  await page.clock.fastForward(3_000); // nova tentativa rápida
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Sem conexão com o servidor.');
  await expect(alert).toContainText('Exibindo os últimos dados recebidos');
  await expect(page.locator('[data-tv-value="nps"]')).toHaveText(npsText ?? '');
  await expectScreenMatches(page, updated);
  // O aviso cabe na tela de TV sem rolagem.
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });
  await capture(page, testInfo, 'TL15-api-indisponivel', STAGE);

  // Recuperação: a consulta seguinte volta a funcionar e o aviso some.
  await page.unroute(`**${SUMMARY_PATH}**`);
  await nextCycle(page);
  await expect(page.getByRole('alert')).toHaveCount(0);

  // RF69: recarga completa da página após 6 h (marcador em window desaparece).
  await page.evaluate(() => {
    (window as unknown as { tvMarker?: number }).tvMarker = 1;
  });
  const reloaded = page.waitForEvent('load');
  await page.clock.fastForward('06:00:00');
  await reloaded;
  expect(
    await page.evaluate(() => (window as unknown as { tvMarker?: number }).tvMarker),
  ).toBeUndefined();
  await expect(page.locator('[data-tv-value="nps"]')).toBeVisible();

  consoleErrors.expectClean(/ERR_CONNECTION_REFUSED|Failed to load resource/);
});

test('T31 — legibilidade em 1920 × 1080: tamanhos, contraste 7:1 e sem rolagem', async ({
  page,
}, testInfo) => {
  onlyTv(testInfo);
  const consoleErrors = watchConsole(page);
  await openTv(page);

  const report = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) throw new Error('Canvas indisponível.');

    /** Cor CSS (inclusive oklch) → RGBA sRGB 0–255, desenhando um pixel. */
    const rgba = (color: string): [number, number, number, number] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a];
    };
    const luminance = ([r, g, b]: [number, number, number, number]) => {
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const background = (element: Element | null): [number, number, number, number] => {
      for (let node = element; node !== null; node = node.parentElement) {
        const color = rgba(getComputedStyle(node).backgroundColor);
        if (color[3] === 255) return color;
      }
      return [255, 255, 255, 255];
    };
    /**
     * Visível de fato: o conteúdo só para leitores de tela (sr-only, caixa de 1 × 1 px) e o que
     * estiver dentro dele não contam.
     */
    const visible = (element: Element) => {
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return false;
        if (getComputedStyle(node).visibility === 'hidden') return false;
      }
      return true;
    };

    const texts: { text: string; size: number; contrast: number }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const element = node.parentElement;
      const text = node.textContent?.trim() ?? '';
      if (element === null || text === '' || !visible(element)) continue;
      const style = getComputedStyle(element);
      const fg = luminance(rgba(style.color));
      const bg = luminance(background(element));
      const contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      texts.push({ text, size: Number.parseFloat(style.fontSize), contrast });
    }

    const sizes = (kind: string) =>
      Array.from(document.querySelectorAll(`[data-tv-size="${kind}"]`)).map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    const root = document.documentElement;
    return {
      texts,
      hero: sizes('hero'),
      number: sizes('number'),
      label: sizes('label'),
      small: sizes('small'),
      scroll: {
        x: root.scrollWidth - root.clientWidth,
        y: root.scrollHeight - root.clientHeight,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  expect(report.viewport).toEqual({ width: 1920, height: 1080 });
  // RF70: NPS 160 px, números 64 px, rótulos 32 px, mínimo 24 px.
  expect(report.hero).toEqual([160]);
  expect(report.number.length).toBeGreaterThanOrEqual(3);
  expect(new Set(report.number)).toEqual(new Set([64]));
  expect(new Set(report.label)).toEqual(new Set([32]));
  expect(new Set(report.small)).toEqual(new Set([24]));
  expect(report.texts.length).toBeGreaterThan(10);
  expect(report.texts.filter((t) => t.size < 24)).toEqual([]);
  // RNF06/RF70: contraste mínimo de 7:1 em todo texto visível.
  expect(report.texts.filter((t) => t.contrast < 7)).toEqual([]);
  // Sem rolagem horizontal nem vertical em 1920 × 1080.
  expect(report.scroll).toEqual({ x: 0, y: 0 });

  await testInfo.attach('medidas-tv-1920.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  consoleErrors.expectClean();
});
