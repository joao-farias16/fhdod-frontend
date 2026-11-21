/**
 * T39 — Acessibilidade ponta a ponta (RNF05–RNF08), com backend e frontend reais:
 * - @axe-core/playwright com as regras WCAG 2.0, 2.1 e 2.2 (A e AA) em TL01–TL17, no início, na
 *   página 404 e na TV Wall, cada tela com o perfil que a usa; critério da Seção 12: nenhuma
 *   violação séria ou crítica. As violações moderadas e menores ficam registradas no anexo;
 * - teclado: link "Pular para o conteúdo", foco visível de 2 px, login só com teclado e Esc
 *   fechando diálogo;
 * - alvos de 44 × 44 px nos botões da administração.
 * Roda em 1440 px e 360 px. Grava somente uma avaliação de nota baixa por projeto (TL10/TL11).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test, type TestInfo } from '@playwright/test';

import { EVIDENCE_ROOT } from './environment';
import { login, readFixture } from './support';

const { accounts, surveys } = readFixture();
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const BLOCKING = new Set(['serious', 'critical']);

interface ScreenResult {
  screen: string;
  url: string;
  violations: { id: string; impact: string | null; help: string; nodes: string[] }[];
}

const results: ScreenResult[] = [];

/** Espera a tela terminar de carregar os dados (sem "Carregando…" na tela). */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.getByText(/^Carregando/)).toHaveCount(0);
}

/** Executa o axe na tela atual; violações sérias ou críticas reprovam o caso (expect.soft). */
async function audit(page: Page, screen: string) {
  await settle(page);
  const analysis = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = analysis.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
  results.push({ screen, url: new URL(page.url()).pathname, violations });
  const blocking = violations
    .filter((violation) => BLOCKING.has(violation.impact ?? ''))
    .map((v) => `${screen}: ${v.id} (${v.impact ?? ''}) — ${v.help} — ${v.nodes.join(' | ')}`);
  expect.soft(blocking, `violações sérias/críticas em ${screen}`).toEqual([]);
}

/** RNF05: botões da administração com pelo menos 44 × 44 px. */
async function expectAdminTargets(page: Page, screen: string) {
  const small = await page.locator('main button:visible').evaluateAll((elements) =>
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.getAttribute('aria-label') ?? element.textContent.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((size) => size.width < 44 || size.height < 44),
  );
  expect.soft(small, `alvos menores que 44 px em ${screen}`).toEqual([]);
}

/** Abre o primeiro link do conteúdo que casa com o padrão (detalhe de um registro). */
async function openFirst(page: Page, href: RegExp) {
  const matching = () =>
    page
      .locator('main a[href]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('href') ?? ''))
      .then((hrefs) => hrefs.filter((value) => href.test(value)));
  await expect
    .poll(async () => (await matching()).length, { message: href.source })
    .toBeGreaterThan(0);
  await page.goto((await matching())[0] ?? '/');
}

test.describe.configure({ mode: 'serial' });

test.afterAll(({ browserName }, testInfo: TestInfo) => {
  const dir = `${EVIDENCE_ROOT}/ET10-ET11`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/axe-${testInfo.project.name}.json`,
    JSON.stringify({ browser: browserName, tags: WCAG_TAGS, results }, null, 2),
  );
});

test('T39 — telas públicas: início, 404, login (TL01), pesquisa (TL09–TL11) e TV (TL15)', async ({
  page,
}) => {
  await page.goto('/');
  await audit(page, 'Início');
  await page.goto('/pagina-que-nao-existe');
  await audit(page, '404');
  await page.goto('/login');
  await audit(page, 'TL01 Login');

  // Pesquisa pública: nota, etapa, confirmação com oferta e formulário de manifestação.
  await page.goto(`/p/${surveys.active}?origem=qr`);
  await audit(page, 'TL09 Pesquisa — nota');
  await page.getByRole('radio', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await audit(page, 'TL09 Pesquisa — etapa');
  await page.getByRole('button', { name: /^Enviar$/ }).click();
  await expect(page.getByRole('heading', { name: 'Resposta enviada' })).toBeVisible();
  await audit(page, 'TL11 Confirmação com oferta');
  await page.getByRole('button', { name: /Registrar manifestação/ }).click();
  const form = page.getByRole('form', { name: 'Registrar manifestação' });
  await expect(form).toBeVisible();
  await audit(page, 'TL10 Manifestação');
  // Envio anônimo (padrão): a Ouvidoria terá um registro para o TL13.
  await form.getByRole('radio', { name: 'Sugestão' }).check();
  await form.getByLabel('O que você quer contar?').fill('Sugiro mais cadeiras na sala de espera.');
  await form.getByRole('button', { name: /Enviar manifestação/ }).click();
  await expect(page.getByRole('heading', { name: 'Manifestação registrada' })).toBeVisible();
  await audit(page, 'TL11 Confirmação com protocolo');

  await page.goto('/tv');
  await audit(page, 'TL15 TV Wall');
});

test('T39 — Superadministrador: TL16, TL17, TL05, TL06, TL07, TL08 e TL02', async ({ page }) => {
  await login(page, accounts.sa.email, accounts.sa.password);
  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  await audit(page, 'TL16 Usuários');
  await expectAdminTargets(page, 'TL16 Usuários');
  await page.goto('/admin/auditoria');
  await audit(page, 'TL17 Auditoria');
  await page.goto('/admin/setores');
  await audit(page, 'TL05 Setores e equipes');
  await expectAdminTargets(page, 'TL05 Setores e equipes');
  await page.goto('/admin/turnos');
  await audit(page, 'TL06 Escala e turnos');
  await page.goto('/admin/escalas/importar');
  await audit(page, 'TL07 Importação de escalas');
  await page.goto('/admin/pesquisas');
  await audit(page, 'TL08 Pesquisas — lista');
  await expectAdminTargets(page, 'TL08 Pesquisas — lista');
  await openFirst(page, /^\/admin\/pesquisas\/[0-9a-f-]{36}$/);
  await audit(page, 'TL08 Pesquisas — edição');
  await page.goto('/trocar-senha');
  await audit(page, 'TL02 Troca de senha');
});

test('T39 — Gestão: TL03, TL04 e TL14', async ({ page }) => {
  await login(page, accounts.ge.email, accounts.ge.password);
  await expect(page).toHaveURL(/\/painel$/);
  await audit(page, 'TL03 Painel');
  await expectAdminTargets(page, 'TL03 Painel');
  await openFirst(page, /^\/painel\/setores\/[0-9a-f-]{36}/);
  await audit(page, 'TL04 Painel por setor');
  await page.goto('/relatorios');
  await audit(page, 'TL14 Relatórios');
});

test('T39 — Ouvidoria: TL12 e TL13', async ({ page }) => {
  await login(page, accounts.ou.email, accounts.ou.password);
  // Sessão aberta (destino pós-login); a sessão fica na aba e sobrevive à navegação.
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/ouvidoria/manifestacoes');
  await expect(page).toHaveURL(/\/ouvidoria\/manifestacoes$/);
  await audit(page, 'TL12 Manifestações');
  await expectAdminTargets(page, 'TL12 Manifestações');
  await openFirst(page, /^\/ouvidoria\/manifestacoes\/[0-9a-f-]{36}$/);
  await audit(page, 'TL13 Detalhe da manifestação');
});

test('T39 — teclado: pular para o conteúdo, foco de 2 px, login sem mouse e Esc no diálogo', async ({
  page,
  browserName,
}) => {
  await page.goto('/login');
  await settle(page);
  // O primeiro Tab chega ao link de salto; Enter leva o foco ao conteúdo principal. No WebKit,
  // como no Safari padrão, Tab pula links (preferência "Pressionar Tab para destacar cada item"),
  // e nenhuma tecla do Playwright no Windows contorna isso: lá o link recebe o foco diretamente.
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  if (browserName === 'webkit') await skip.focus();
  else await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();

  // Login só com teclado; foco visível de 2 px no campo focado.
  const email = page.getByLabel('E-mail');
  await email.focus();
  expect(await email.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px');
  await page.keyboard.type(accounts.sa.email);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused();
  await page.keyboard.type(accounts.sa.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  await settle(page);

  // Diálogo: abre pelo teclado e fecha com Esc, devolvendo o foco ao botão.
  const open = page.getByRole('button', { name: /Novo usuário/ });
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
});
