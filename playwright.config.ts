import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from '@playwright/test';

import { API_DIR, API_URL, BACKEND_PORT, FRONTEND_PORT } from './e2e/environment';

// Variáveis locais da API (banco de TESTE, JWT_SECRET etc.); nunca serviços remotos.
const apiEnvFile = resolve(API_DIR, '.env');
if (existsSync(apiEnvFile)) process.loadEnvFile(apiEnvFile);

/**
 * DB_* da API apontando para o banco de TESTE, com as mesmas regras do script e2e:fixture da API
 * (scripts/db/connection.ts): TEST_DB_HOST/PORT/USER vazias usam a DB_* do .env (já carregada
 * acima); TEST_DB_PASSWORD, se definida, vale mesmo vazia; TEST_DB_NAME padrão fhdod_test.
 */
function testDatabaseEnv(): Record<string, string> {
  const result: Record<string, string> = {
    DB_NAME: process.env.TEST_DB_NAME || 'fhdod_test',
    DB_SSL: 'false',
  };
  for (const name of ['DB_HOST', 'DB_PORT', 'DB_USER']) {
    const value = process.env[`TEST_${name}`];
    if (value !== undefined && value !== '') result[name] = value;
  }
  const password = process.env.TEST_DB_PASSWORD;
  if (password !== undefined) result.DB_PASSWORD = password;
  return result;
}

/**
 * Testes ponta a ponta (Seção 12) com a autenticação da API, backend e frontend reais. Portas
 * próprias (3334 e 5174) para não reutilizar servidores de desenvolvimento: o backend dos testes
 * usa o banco de teste (TEST_DB_*, como o `npm run e2e:fixture` da API), e as contas fictícias
 * são criadas e excluídas pelo global-setup.
 * O frontend chama a API diretamente (VITE_API_URL), como na publicação, passando pelo CORS.
 *
 * A API é um projeto separado: FHDOD_API_DIR aponta para a pasta dele (padrão: a pasta acima
 * desta, enquanto o frontend estiver dentro do repositório da API). Usa o Chrome instalado
 * (channel: 'chrome'), sem baixar navegadores. Exige o MySQL local e o banco de teste da API.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    channel: 'chrome',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'computador-1440', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'celular-360',
      // O fluxo administrativo grava dados; roda uma vez, no computador.
      testIgnore: /(administracao|escalas-e-pesquisas|manifestacoes-painel-relatorios)\.spec\.ts/,
      use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      // Script publicado pela API (sem modo watch).
      command: 'npm run dev:no-watch',
      cwd: API_DIR,
      url: `http://localhost:${BACKEND_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: BACKEND_PORT,
        // A API lê DB_*; os dados E2E ficam no banco de TESTE (TEST_DB_*), como no e2e:fixture.
        ...testDatabaseEnv(),
        CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
        // Links e QR Code das pesquisas apontam para o frontend dos testes (ET05, T02).
        PUBLIC_APP_URL: `http://localhost:${FRONTEND_PORT}`,
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: 'npx vite',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_PORT: FRONTEND_PORT, VITE_API_URL: API_URL },
    },
  ],
});
