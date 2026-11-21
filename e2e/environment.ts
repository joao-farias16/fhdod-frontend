import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * Sufixo desta execução (6 hexadecimais), compartilhado pelo `e2e:fixture` da API, que cria o
 * hospital exclusivo da TV Wall `E2E-TV-<sufixo>`, e pela API dos testes, que o exibe no E42
 * (TV_WALL_HOSPITAL_SHORT_NAME, ET10). Definido uma vez no processo principal do Playwright; os
 * workers e o script do fixture herdam o mesmo valor pelo ambiente.
 */
process.env.E2E_RUN_ID ??= randomBytes(3).toString('hex');
export const TV_WALL_HOSPITAL_SHORT_NAME = `E2E-TV-${process.env.E2E_RUN_ID}`;

/** Portas próprias dos testes E2E (não reutilizam os servidores de desenvolvimento). */
export const BACKEND_PORT = '3334';
export const FRONTEND_PORT = '5174';

/** Endereço da API usado pelo frontend nos testes (VITE_API_URL). */
export const API_URL = `http://localhost:${BACKEND_PORT}`;

/**
 * Pasta do projeto da API (backend), que é independente deste frontend. Padrão: a pasta acima de
 * frontend/, enquanto ele estiver dentro do repositório da API. Fora dele, defina FHDOD_API_DIR.
 */
export const API_DIR = resolve(import.meta.dirname, '..', process.env.FHDOD_API_DIR ?? '..');

/**
 * Pasta das capturas de tela (somente dados fictícios). Padrão: test-results/evidencias (ignorada
 * pelo Git). Para atualizar as evidências versionadas da API, defina E2E_EVIDENCE_DIR, por exemplo
 * `../docs/evidencias`.
 */
export const EVIDENCE_ROOT = resolve(
  import.meta.dirname,
  '..',
  process.env.E2E_EVIDENCE_DIR ?? 'test-results/evidencias',
);
