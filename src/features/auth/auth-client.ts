import { ApiError, apiRequest } from '../../lib/api-client';

export type SignInFailure = 'invalid_credentials' | 'rate_limited' | 'network';

export type SignInResult = { ok: true; accessToken: string } | { ok: false; reason: SignInFailure };

/**
 * Sessão administrativa na autenticação própria da API (E44 login, E45 renovação, E46 logout),
 * isolada atrás desta interface para que as telas sejam testadas sem a API. A senha nunca é
 * guardada pela aplicação.
 */
export interface AuthClient {
  /**
   * Token de acesso válido ou null (sem sessão, ou renovação recusada com 401). Renova pelo E45
   * quando o token está para expirar. 403 ACCOUNT_DISABLED na renovação encerra a sessão local e é
   * repassado como ApiError; falha de rede é repassada sem encerrar a sessão.
   */
  getAccessToken(): Promise<string | null>;
  /**
   * Renova a sessão depois de um 401 da API com `staleToken`. Se outra requisição já renovou (o
   * token atual é outro), devolve o token atual sem chamar o E45. Mesmas regras de getAccessToken.
   */
  refreshAccessToken(staleToken: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<SignInResult>;
  /** Encerra a sessão: revoga no servidor (E46) e apaga os dados locais (RF02). */
  signOut(): Promise<void>;
  /** Avisa as renovações (novo token) e o fim da sessão por renovação recusada (null). */
  onSessionChange(listener: (accessToken: string | null) => void): () => void;
}

/** Chave da sessão no sessionStorage (apagada ao fechar a aba e no logout). */
export const AUTH_STORAGE_KEY = 'fhdod-admin-auth';

/** Renova o token de acesso este tempo antes de expirar. */
export const REFRESH_MARGIN_MS = 60_000;

/** Tokens devolvidos por E44 (login) e E45 (renovação). */
interface SessionTokens {
  accessToken: string;
  tokenType: 'Bearer';
  /** Validade do token de acesso, em segundos. */
  expiresIn: number;
  expiresAt: string;
  /** Token de renovação de uso único: cada renovação devolve um novo. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

interface StoredSession {
  accessToken: string;
  /**
   * Expiração do token de acesso no relógio LOCAL (instante do recebimento + expiresIn), para não
   * depender do acerto entre o relógio do navegador e o do servidor.
   */
  accessExpiresAt: number;
  refreshToken: string;
}

function isSessionTokens(value: unknown): value is SessionTokens {
  if (typeof value !== 'object' || value === null) return false;
  const tokens = value as Record<string, unknown>;
  return (
    typeof tokens.accessToken === 'string' &&
    tokens.accessToken !== '' &&
    typeof tokens.refreshToken === 'string' &&
    tokens.refreshToken !== '' &&
    typeof tokens.expiresIn === 'number' &&
    tokens.expiresIn > 0
  );
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.accessExpiresAt === 'number'
  );
}

function readSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession): void {
  try {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Armazenamento indisponível (modo privado): a sessão vale só enquanto a página estiver aberta.
  }
}

/** Remove qualquer resto da sessão do armazenamento do navegador. */
function purgeStoredSession(): void {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(AUTH_STORAGE_KEY)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Armazenamento indisponível (modo privado): nada a limpar.
  }
}

function sessionOf(tokens: SessionTokens): StoredSession {
  return {
    accessToken: tokens.accessToken,
    accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
    refreshToken: tokens.refreshToken,
  };
}

export function createApiAuthClient(): AuthClient {
  /** Cópia em memória da sessão (fonte principal; o sessionStorage mantém a sessão no F5). */
  let memory: StoredSession | null = null;
  /** Renovação em andamento: requisições simultâneas aguardam a mesma (token de uso único). */
  let refreshing: Promise<string | null> | null = null;
  /** Muda a cada login/logout: uma renovação iniciada antes não grava tokens depois. */
  let generation = 0;
  const listeners = new Set<(accessToken: string | null) => void>();

  function current(): StoredSession | null {
    memory ??= readSession();
    return memory;
  }

  function store(session: StoredSession): void {
    memory = session;
    writeSession(session);
  }

  function clear(): void {
    memory = null;
    purgeStoredSession();
  }

  function notify(accessToken: string | null): void {
    for (const listener of listeners) listener(accessToken);
  }

  async function renew(session: StoredSession): Promise<string | null> {
    const started = generation;
    let tokens: unknown;
    try {
      ({ data: tokens } = await apiRequest<unknown>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: session.refreshToken },
      }));
    } catch (error) {
      if (started !== generation) return current()?.accessToken ?? null;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        // Token recusado (sessão revogada, expirada ou reutilizada) ou conta desativada.
        clear();
        notify(null);
        if (error.status === 403) throw error;
        return null;
      }
      // Rede, limite de requisições ou erro do servidor: a sessão continua; nova tentativa depois.
      throw error;
    }
    // Logout ou novo login durante a renovação: não ressuscita a sessão anterior.
    if (started !== generation) return current()?.accessToken ?? null;
    if (!isSessionTokens(tokens)) {
      throw new ApiError(200, 'UNEXPECTED_RESPONSE', 'Resposta inesperada do servidor.');
    }
    // Rotação: o token de renovação apresentado deixou de valer; guarda o novo antes de liberar.
    const next = sessionOf(tokens);
    store(next);
    notify(next.accessToken);
    return next.accessToken;
  }

  function refreshOnce(session: StoredSession): Promise<string | null> {
    refreshing ??= renew(session).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function getAccessToken(): Promise<string | null> {
    if (refreshing !== null) return refreshing;
    const session = current();
    if (session === null) return null;
    if (session.accessExpiresAt - Date.now() > REFRESH_MARGIN_MS) return session.accessToken;
    return refreshOnce(session);
  }

  return {
    getAccessToken,

    async refreshAccessToken(staleToken) {
      if (refreshing !== null) return refreshing;
      const session = current();
      if (session === null) return null;
      if (session.accessToken !== staleToken) return session.accessToken;
      return refreshOnce(session);
    },

    async signIn(email, password) {
      try {
        const { data } = await apiRequest<unknown>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        if (!isSessionTokens(data)) return { ok: false, reason: 'network' };
        generation += 1;
        const session = sessionOf(data);
        store(session);
        return { ok: true, accessToken: session.accessToken };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 429) return { ok: false, reason: 'rate_limited' };
          // Senha errada, e-mail inexistente, conta desativada ou dados inválidos: recusa genérica.
          if (error.status === 400 || error.status === 401 || error.status === 403) {
            return { ok: false, reason: 'invalid_credentials' };
          }
        }
        return { ok: false, reason: 'network' };
      }
    },

    async signOut() {
      let accessToken: string | null;
      try {
        // Token vencido: renova antes, para que o E46 revogue a sessão no servidor.
        accessToken = await getAccessToken();
      } catch {
        accessToken = current()?.accessToken ?? null;
      }
      generation += 1;
      clear();
      if (accessToken === null) return;
      try {
        await apiRequest('/auth/logout', { method: 'POST', token: accessToken });
      } catch {
        // Sem rede ou sessão já encerrada: a sessão local é apagada mesmo assim.
      }
    },

    onSessionChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
