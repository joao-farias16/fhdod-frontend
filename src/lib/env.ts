/** Ambientes reconhecidos pela interface. */
export type AppEnv = 'development' | 'test' | 'production';

/** Prefixo versionado de todos os endpoints da API REST. */
export const API_PREFIX = '/api/v1';

export interface PublicEnv {
  /** Base das requisições HTTP: VITE_API_URL + /api/v1 (ou só /api/v1, na mesma origem). */
  apiBaseUrl: string;
  appEnv: AppEnv;
}

const APP_ENVS: readonly AppEnv[] = ['development', 'test', 'production'];

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

/**
 * Lê e valida as variáveis públicas do Vite (somente VITE_*). Em produção, URLs absolutas devem
 * usar HTTPS (RNF09). Variáveis VITE_* vão para o navegador: nunca contêm segredos (Seção 10); a
 * autenticação é feita pela API (E44–E46), sem configuração própria no frontend.
 *
 * VITE_API_URL é o endereço da API, sem o prefixo /api/v1 (ex.: http://localhost:3333). Vazia, as
 * requisições usam a mesma origem da página (/api/v1), atendida pelo proxy do Vite em
 * desenvolvimento ou por um proxy reverso na publicação.
 */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const apiUrl = (source.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  const appEnv = (source.VITE_APP_ENV ?? 'development').trim();

  if (!isAppEnv(appEnv)) {
    throw new Error(`VITE_APP_ENV inválido. Use: ${APP_ENVS.join(', ')}.`);
  }
  if (apiUrl !== '' && !/^https?:\/\/[^/]/.test(apiUrl)) {
    throw new Error('VITE_API_URL deve ser uma URL http(s), como http://localhost:3333.');
  }
  if (apiUrl.endsWith(API_PREFIX)) {
    throw new Error(`VITE_API_URL não deve incluir ${API_PREFIX}: informe só o endereço da API.`);
  }
  if (appEnv === 'production' && apiUrl !== '' && !apiUrl.startsWith('https://')) {
    throw new Error('Em produção, VITE_API_URL deve usar https://.');
  }
  const apiBaseUrl = `${apiUrl}${API_PREFIX}`;
  return { apiBaseUrl, appEnv };
}

export const env: PublicEnv = parsePublicEnv(import.meta.env);
