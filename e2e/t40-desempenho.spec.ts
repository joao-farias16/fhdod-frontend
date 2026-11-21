/**
 * T40 — Desempenho para demonstração (RNF26), ponta a ponta com o backend ativo: 20 envios da
 * pesquisa (clique em Enviar → confirmação) em até 2 s e 20 carregamentos do painel (navegação →
 * indicadores, setores e tendência na tela) em até 3 s, em 19 de 20 medições.
 * Ambiente local: API e MySQL na mesma máquina e o frontend no servidor de desenvolvimento do Vite
 * (mais lento que o build publicado). Os tempos ficam em <evidências>/ET10-ET11/t40-desempenho.json.
 * Grava 20 respostas: roda uma vez, no computador.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { EVIDENCE_ROOT } from './environment';
import { login, readFixture } from './support';

const { surveys, accounts } = readFixture();
const QR_PATH = `/p/${surveys.active}?origem=qr`;
const NPS = /o quanto você recomendaria o atendimento/;
const RUNS = 20;

/** Quantas medições ficaram dentro do limite. */
const within = (times: number[], limit: number) => times.filter((ms) => ms <= limit).length;

test.describe.configure({ mode: 'serial' });

const timings: { envioMs: number[]; painelMs: number[] } = { envioMs: [], painelMs: [] };

test.afterAll(() => {
  // Nos projetos em que o T40 é ignorado não há medições: não sobrescreve o arquivo.
  if (timings.envioMs.length === 0 && timings.painelMs.length === 0) return;
  const dir = `${EVIDENCE_ROOT}/ET10-ET11`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/t40-desempenho.json`, JSON.stringify(timings, null, 2));
});

test('T40 — 20 envios da pesquisa em até 2 s (19 de 20)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'computador-1440', 'Grava respostas: roda uma vez.');
  test.setTimeout(240_000);
  for (let run = 0; run < RUNS; run += 1) {
    await page.goto(QR_PATH);
    await expect(page.getByRole('heading', { name: NPS })).toBeVisible();
    await page.getByRole('radio', { name: '9', exact: true }).click();
    await page.getByRole('button', { name: /Continuar/ }).click();
    const send = page.getByRole('button', { name: /^Enviar$/ });
    await expect(send).toBeEnabled();
    const started = Date.now();
    await send.click();
    await expect(page.getByRole('heading', { name: 'Resposta enviada' })).toBeVisible();
    timings.envioMs.push(Date.now() - started);
    // E02 aceita 30 envios por minuto por IP (T38): espaça as medições para não medir o 429.
    await page.waitForTimeout(2_500);
  }
  await testInfo.attach('envios.json', { body: JSON.stringify(timings.envioMs) });
  expect(within(timings.envioMs, 2_000)).toBeGreaterThanOrEqual(19);
});

test('T40 — 20 carregamentos do painel em até 3 s (19 de 20)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'computador-1440', 'Roda uma vez, no computador.');
  test.setTimeout(240_000);
  await login(page, accounts.ge.email, accounts.ge.password);
  await expect(page).toHaveURL(/\/painel$/);
  for (let run = 0; run < RUNS; run += 1) {
    const started = Date.now();
    await page.goto('/painel');
    // Indicadores (E28), setores (E29) e tendência (E32) desenhados, sem "Carregando".
    await expect(page.getByText(/^n = \d/).first()).toBeVisible();
    await expect(page.getByRole('group', { name: /Tendência do NPS/ })).toBeVisible();
    await expect(page.getByRole('region', { name: /setor/i }).first()).toBeVisible();
    await expect(page.getByText(/^Carregando/)).toHaveCount(0);
    timings.painelMs.push(Date.now() - started);
  }
  await testInfo.attach('painel.json', { body: JSON.stringify(timings.painelMs) });
  expect(within(timings.painelMs, 3_000)).toBeGreaterThanOrEqual(19);
});
