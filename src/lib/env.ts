/** Ambientes reconhecidos pela interface. */
export type AppEnv = 'development' | 'test' | 'production';

/** Prefixo versionado de todos os endpoints da API REST. */
export const API_PREFIX = '/api/v1';

export interface PublicEnv {
  /** Base das requisições HTTP: VITE_API_URL + /api/v1 (ou só /api/v1, na mesma origem). */
  apiBaseUrl: string;
  appEnv: AppEnv;
  /** Supabase Auth (ET03): URL do projeto e chave PUBLICÁVEL. Vazias, o login fica indisponível. */
  supabaseUrl: string;
  supabasePublishableKey: string;
}

const APP_ENVS: readonly AppEnv[] = ['development', 'test', 'production'];

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

/**
 * Lê e valida as variáveis públicas do Vite (somente VITE_*). Em produção, URLs absolutas devem
 * usar HTTPS (RNF09). A chave secreta do Supabase nunca pode chegar ao navegador (Seção 10).
 *
 * VITE_API_URL é o endereço da API, sem o prefixo /api/v1 (ex.: http://localhost:3333). Vazia, as
 * requisições usam a mesma origem da página (/api/v1), atendida pelo proxy do Vite em
 * desenvolvimento ou por um proxy reverso na publicação.
 */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const apiUrl = (source.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  const appEnv = (source.VITE_APP_ENV ?? 'development').trim();
  const supabaseUrl = (source.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const supabasePublishableKey = (source.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

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
  if (supabaseUrl !== '' && !/^https?:\/\//.test(supabaseUrl)) {
    throw new Error('VITE_SUPABASE_URL deve ser uma URL http(s).');
  }
  if (appEnv === 'production' && supabaseUrl !== '' && !supabaseUrl.startsWith('https://')) {
    throw new Error('Em produção, VITE_SUPABASE_URL deve usar https://.');
  }
  // Chave secreta (sb_secret_…) ou JWT de service_role no navegador: recusa imediata.
  if (
    /^sb_secret_/i.test(supabasePublishableKey) ||
    /service_role/.test(decodeJwtRole(supabasePublishableKey))
  ) {
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY recebeu uma chave secreta. Use a chave publicável.',
    );
  }
  return { apiBaseUrl, appEnv, supabaseUrl, supabasePublishableKey };
}

/** Papel de uma chave legada em formato JWT (anon ou service_role); vazio se não for JWT. */
function decodeJwtRole(key: string): string {
  const payload = key.split('.')[1];
  if (payload === undefined) return '';
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' &&
      parsed !== null &&
      'role' in parsed &&
      typeof parsed.role === 'string'
      ? parsed.role
      : '';
  } catch {
    return '';
  }
}

export const env: PublicEnv = parsePublicEnv(import.meta.env);
