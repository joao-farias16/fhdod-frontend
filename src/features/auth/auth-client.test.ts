/**
 * Cliente de sessão sobre a autenticação da API (E44 login, E45 renovação, E46 logout), com a API
 * simulada: toda recusa de login vira mensagem genérica (exceto limite e rede); o token de
 * renovação é rotacionado a cada uso e renovações simultâneas usam uma única chamada ao E45; o
 * logout revoga no servidor e sempre apaga a sessão guardada (RF02).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_STORAGE_KEY, createApiAuthClient, REFRESH_MARGIN_MS } from './auth-client';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const TTL_SECONDS = 3600;

/** Tokens no formato do E44/E45 (refresh tokens fictícios de 43 caracteres). */
function tokens(access: string, refresh: string) {
  return {
    accessToken: access,
    tokenType: 'Bearer',
    expiresIn: TTL_SECONDS,
    expiresAt: new Date(NOW.getTime() + TTL_SECONDS * 1000).toISOString(),
    refreshToken: refresh.padEnd(43, 'x'),
    refreshTokenExpiresAt: '2026-11-12T12:00:00.000Z',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiError(status: number, code: string): Response {
  return json({ error: { code, message: 'Erro.', details: [], requestId: 'req-1' } }, status);
}

interface Call {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

/** API simulada: fila de respostas por rota "MÉTODO /caminho". */
function mockFetch(routes: Record<string, (call: Call) => Response | Promise<Response>>) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(href, 'http://localhost').pathname.replace(/^\/api\/v1/, '');
    const call: Call = {
      method: init?.method ?? 'GET',
      path,
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      authorization: new Headers(init?.headers).get('Authorization'),
    };
    calls.push(call);
    const handler = routes[`${call.method} ${path}`];
    if (handler === undefined) return apiError(500, 'INTERNAL_ERROR');
    return handler(call);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Avança o relógio até faltar menos que a margem para o token de acesso expirar. */
function nearExpiry() {
  vi.setSystemTime(NOW.getTime() + TTL_SECONDS * 1000 - REFRESH_MARGIN_MS + 1);
}

async function signedIn(access = 'acc-1', refresh = 'ref-1') {
  mockFetch({ 'POST /auth/login': () => json({ data: { ...tokens(access, refresh), user: {} } }) });
  const client = createApiAuthClient();
  await client.signIn('sa@example.com', 'SenhaCorreta123');
  return client;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createApiAuthClient — login (E44)', () => {
  it('login válido envia e-mail e senha, guarda os tokens e devolve o token de acesso', async () => {
    const { calls } = mockFetch({
      'POST /auth/login': () => json({ data: { ...tokens('acc-1', 'ref-1'), user: {} } }),
    });
    const client = createApiAuthClient();

    await expect(client.signIn('sa@example.com', 'SenhaCorreta123')).resolves.toEqual({
      ok: true,
      accessToken: 'acc-1',
    });
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/auth/login',
        body: { email: 'sa@example.com', password: 'SenhaCorreta123' }, // gitleaks:allow — fictícia
        authorization: null,
      },
    ]);
    await expect(client.getAccessToken()).resolves.toBe('acc-1');
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY) ?? '';
    expect(stored).toContain('acc-1');
    // A senha nunca é guardada.
    expect(stored).not.toContain('SenhaCorreta123');
  });

  it.each([
    [
      'senha errada / e-mail inexistente',
      apiError(401, 'INVALID_CREDENTIALS'),
      'invalid_credentials',
    ],
    ['conta desativada', apiError(403, 'ACCOUNT_DISABLED'), 'invalid_credentials'],
    ['corpo inválido', apiError(400, 'VALIDATION_ERROR'), 'invalid_credentials'],
    ['muitas tentativas', apiError(429, 'RATE_LIMITED'), 'rate_limited'],
    ['servidor indisponível', apiError(503, 'SERVICE_UNAVAILABLE'), 'network'],
    ['resposta sem tokens', json({ data: { user: {} } }), 'network'],
  ])('%s → %s', async (_case, response, reason) => {
    mockFetch({ 'POST /auth/login': () => response });
    const client = createApiAuthClient();

    await expect(client.signIn('a@example.com', 'x')).resolves.toEqual({ ok: false, reason });
    await expect(client.getAccessToken()).resolves.toBeNull();
  });

  it('falha de rede no login vira reason network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(createApiAuthClient().signIn('a@example.com', 'x')).resolves.toEqual({
      ok: false,
      reason: 'network',
    });
  });

  it('sem sessão guardada, getAccessToken devolve null sem chamar a API', async () => {
    const { fetchMock } = mockFetch({});
    await expect(createApiAuthClient().getAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a sessão sobrevive ao recarregamento da página (novo cliente, mesmo sessionStorage)', async () => {
    await signedIn('acc-1', 'ref-1');
    const { fetchMock } = mockFetch({});
    await expect(createApiAuthClient().getAccessToken()).resolves.toBe('acc-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createApiAuthClient — renovação e rotação (E45)', () => {
  it('token válido é usado sem renovar', async () => {
    const client = await signedIn();
    const { fetchMock } = mockFetch({});
    vi.setSystemTime(NOW.getTime() + 30 * 60_000);
    await expect(client.getAccessToken()).resolves.toBe('acc-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('perto de expirar: renova, guarda o NOVO token de renovação e o usa na renovação seguinte', async () => {
    const client = await signedIn('acc-1', 'ref-1');
    const responses = [tokens('acc-2', 'ref-2'), tokens('acc-3', 'ref-3')];
    const { calls } = mockFetch({ 'POST /auth/refresh': () => json({ data: responses.shift() }) });

    nearExpiry();
    await expect(client.getAccessToken()).resolves.toBe('acc-2');
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toContain('ref-2');
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toContain('ref-1');

    vi.setSystemTime(NOW.getTime() + 2 * TTL_SECONDS * 1000 - REFRESH_MARGIN_MS);
    await expect(client.getAccessToken()).resolves.toBe('acc-3');

    expect(calls.map((call) => call.body)).toEqual([
      { refreshToken: 'ref-1'.padEnd(43, 'x') },
      { refreshToken: 'ref-2'.padEnd(43, 'x') },
    ]);
    // O E45 é público: o token de renovação vai no corpo, nunca no cabeçalho.
    expect(calls.every((call) => call.authorization === null)).toBe(true);
  });

  it('requisições simultâneas com token vencido fazem UMA única renovação', async () => {
    const client = await signedIn();
    let release: (() => void) | undefined;
    const { calls } = mockFetch({
      'POST /auth/refresh': () =>
        new Promise<Response>((resolve) => {
          release = () => {
            resolve(json({ data: tokens('acc-2', 'ref-2') }));
          };
        }),
    });

    nearExpiry();
    const pending = [
      client.getAccessToken(),
      client.getAccessToken(),
      client.refreshAccessToken('acc-1'),
      client.getAccessToken(),
    ];
    await vi.waitFor(() => {
      expect(release).toBeDefined();
    });
    release?.();

    await expect(Promise.all(pending)).resolves.toEqual(['acc-2', 'acc-2', 'acc-2', 'acc-2']);
    expect(calls).toHaveLength(1);
  });

  it('renovação forçada após 401: não renova se outra requisição já trocou o token', async () => {
    const client = await signedIn();
    const { calls } = mockFetch({
      'POST /auth/refresh': () => json({ data: tokens('acc-2', 'ref-2') }),
    });

    await expect(client.refreshAccessToken('acc-1')).resolves.toBe('acc-2');
    await expect(client.refreshAccessToken('acc-1')).resolves.toBe('acc-2');
    expect(calls).toHaveLength(1);
  });

  it('avisa as renovações aos inscritos e permite cancelar a inscrição', async () => {
    const client = await signedIn();
    mockFetch({ 'POST /auth/refresh': () => json({ data: tokens('acc-2', 'ref-2') }) });
    const listener = vi.fn();
    const stop = client.onSessionChange(listener);

    await client.refreshAccessToken('acc-1');
    stop();

    expect(listener.mock.calls).toEqual([['acc-2']]);
  });

  it('401 na renovação (sessão revogada, expirada ou token reutilizado): encerra e avisa', async () => {
    const client = await signedIn();
    mockFetch({ 'POST /auth/refresh': () => apiError(401, 'UNAUTHENTICATED') });
    const listener = vi.fn();
    client.onSessionChange(listener);

    nearExpiry();
    await expect(client.getAccessToken()).resolves.toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    await expect(client.getAccessToken()).resolves.toBeNull();
  });

  it('403 ACCOUNT_DISABLED na renovação: encerra a sessão local e repassa o erro', async () => {
    const client = await signedIn();
    mockFetch({ 'POST /auth/refresh': () => apiError(403, 'ACCOUNT_DISABLED') });

    nearExpiry();
    await expect(client.getAccessToken()).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_DISABLED',
    });
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('falha de rede na renovação mantém a sessão para nova tentativa', async () => {
    const client = await signedIn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));

    nearExpiry();
    await expect(client.getAccessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toContain('ref-1');

    mockFetch({ 'POST /auth/refresh': () => json({ data: tokens('acc-2', 'ref-2') }) });
    await expect(client.getAccessToken()).resolves.toBe('acc-2');
  });
});

describe('createApiAuthClient — logout (E46)', () => {
  it('revoga a sessão no servidor com o token de acesso e apaga a sessão guardada', async () => {
    const client = await signedIn();
    sessionStorage.setItem('fhdod:outra', 'mantida');
    const { calls } = mockFetch({ 'POST /auth/logout': () => new Response(null, { status: 204 }) });

    await client.signOut();

    expect(calls).toEqual([
      { method: 'POST', path: '/auth/logout', body: undefined, authorization: 'Bearer acc-1' },
    ]);
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem('fhdod:outra')).toBe('mantida');
    await expect(client.getAccessToken()).resolves.toBeNull();
  });

  it('token vencido: renova antes para que o E46 revogue a sessão', async () => {
    const client = await signedIn();
    const { calls } = mockFetch({
      'POST /auth/refresh': () => json({ data: tokens('acc-2', 'ref-2') }),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });

    nearExpiry();
    await client.signOut();

    expect(calls.map((call) => `${call.method} ${call.path} ${call.authorization}`)).toEqual([
      'POST /auth/refresh null',
      'POST /auth/logout Bearer acc-2',
    ]);
  });

  it('sem rede, a sessão local é apagada mesmo assim', async () => {
    const client = await signedIn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(client.signOut()).resolves.toBeUndefined();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('sem sessão, não chama a API', async () => {
    const { fetchMock } = mockFetch({});
    await createApiAuthClient().signOut();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renovação em andamento não ressuscita a sessão depois do logout', async () => {
    const client = await signedIn();
    let release: (() => void) | undefined;
    mockFetch({
      'POST /auth/refresh': () =>
        new Promise<Response>((resolve) => {
          release = () => {
            resolve(json({ data: tokens('acc-2', 'ref-2') }));
          };
        }),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });

    const renewal = client.refreshAccessToken('acc-1');
    await vi.waitFor(() => {
      expect(release).toBeDefined();
    });
    // O logout aguarda a renovação em andamento (para revogar com o token atual) e então limpa.
    const logout = client.signOut();
    release?.();
    await renewal;
    await logout;

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    await expect(client.getAccessToken()).resolves.toBeNull();
  });
});
