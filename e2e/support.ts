import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, type TestInfo } from '@playwright/test';

import { API_DIR, EVIDENCE_ROOT } from './environment';

export { API_URL } from './environment';

export const GENERIC_ERROR = 'E-mail ou senha incorretos. Confira os dados e tente novamente.';

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function logout(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** RNF01: sem rolagem horizontal na página. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Captura de tela para <EVIDENCE_ROOT>/<etapa>/telas (somente dados fictícios). */
export async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
  stage = 'ET03',
): Promise<void> {
  const dir = `${EVIDENCE_ROOT}/${stage}/telas`;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}-${testInfo.project.name}.png`, fullPage: true });
}

/** Arquivo com as contas fictícias da execução (ignorado pelo Git; apagado no teardown). */
export const FIXTURE_FILE = resolve(import.meta.dirname, '../playwright/.cache/e2e-fixture.json');

export interface E2EAccount {
  email: string;
  password: string;
}

export interface E2EFixture {
  hospitalId: string;
  accounts: { sa: E2EAccount; vi: E2EAccount; ou: E2EAccount; ge: E2EAccount };
  /** Pesquisas publicadas do Pronto Atendimento E2E (ET06): ativa e desativada. */
  surveys: { active: string; inactive: string };
  /**
   * Hospital exclusivo da E2E da TV Wall (ET10), exibido pela API dos testes e sem respostas no
   * início: nomes dos dois setores e slugs da pesquisa publicada de cada um.
   */
  tvWall: {
    hospitalShortName: string;
    sectors: { primary: string; secondary: string };
    surveys: { primary: string; secondary: string };
  };
}

/**
 * Executa o script `npm run e2e:fixture` do projeto da API (banco MySQL de teste local,
 * TEST_DB_*). O frontend não importa código da API: apenas aciona o comando publicado por ela.
 */
export function runFixture(command: 'setup' | 'teardown'): void {
  // Uma única linha de comando com o caminho entre aspas: no Windows o npm (npm.cmd) só roda pelo
  // shell, que não escapa argumentos — um caminho com espaço ("C:\Users\Nome Sobrenome\...") era
  // partido ao meio (EPERM) e o Node avisava DEP0190.
  const result = spawnSync(`npm run e2e:fixture -- ${command} "${FIXTURE_FILE}"`, {
    cwd: API_DIR,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) throw new Error(`Falha ao preparar os dados E2E (${command}).`);
}

export function readFixture(): E2EFixture {
  if (!existsSync(FIXTURE_FILE))
    throw new Error('Dados E2E ausentes: o global-setup não foi executado.');
  return JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')) as E2EFixture;
}
