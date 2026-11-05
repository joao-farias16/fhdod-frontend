import { useQueryClient } from '@tanstack/react-query';
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiDownload, ApiError, type ApiRequestInit, apiRequest } from '../../lib/api-client';
import { type AuthClient, createApiAuthClient } from './auth-client';
import {
  AuthClientContext,
  type AuthContextValue,
  AuthContext,
  type AuthState,
} from './auth-context';
import type { Me } from './auth-types';

/** Mensagem única para qualquer falha de login: não revela se o e-mail existe (RF01). */
export const GENERIC_LOGIN_ERROR =
  'E-mail ou senha incorretos. Confira os dados e tente novamente.';

const SIGN_IN_MESSAGES = {
  invalid_credentials: GENERIC_LOGIN_ERROR,
  rate_limited: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
  network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
} as const;

const SESSION_EXPIRED = 'Sua sessão terminou. Entre novamente para continuar.';
const ACCOUNT_DISABLED = 'Sua conta está desativada. Procure o superadministrador.';

async function fetchMe(token: string): Promise<Me> {
  const { data } = await apiRequest<Me>('/me', { token });
  return data;
}

/**
 * Estado da sessão administrativa (Seção 6, fluxo de acesso): login, renovação e logout na API
 * (E44–E46), perfil e permissões pelo E04, troca de senha pendente, logout com limpeza dos dados
 * em memória.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const injected = useContext(AuthClientContext);
  const client = useMemo<AuthClient>(() => injected ?? createApiAuthClient(), [injected]);
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const signOut = useCallback(
    async (notice?: string) => {
      try {
        await client.signOut();
      } finally {
        // RF02: nenhum dado administrativo permanece em memória após sair.
        queryClient.clear();
        // Sem aviso = Sair explícito; com aviso = sessão expirada ou conta desativada.
        setState({ status: 'signedOut', notice, explicit: notice === undefined });
      }
    },
    [client, queryClient],
  );

  /** Converte a sessão guardada (token ou nada) em perfil carregado pelo E04. */
  const resolveSession = useCallback(
    async (token: string | null) => {
      if (token === null) {
        setState({ status: 'signedOut' });
        return;
      }
      try {
        let me: Me;
        try {
          me = await fetchMe(token);
        } catch (error) {
          // Token recusado pelo servidor: uma renovação (E45) antes de desistir da sessão.
          if (!(error instanceof ApiError && error.status === 401)) throw error;
          const renewed = await client.refreshAccessToken(token);
          if (renewed === null) throw error;
          me = await fetchMe(renewed);
        }
        setState({ status: 'signedIn', me });
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await signOut(error.code === 'ACCOUNT_DISABLED' ? ACCOUNT_DISABLED : SESSION_EXPIRED);
          return;
        }
        setState({ status: 'error', message: 'Não foi possível verificar sua sessão.' });
      }
    },
    [client, signOut],
  );

  const sessionUnavailable = useCallback(
    async (error: unknown) => {
      // Renovação recusada por conta desativada: encerra; rede/servidor: permite tentar de novo.
      if (error instanceof ApiError && error.code === 'ACCOUNT_DISABLED') {
        await signOut(ACCOUNT_DISABLED);
        return;
      }
      setState({ status: 'error', message: 'Não foi possível verificar sua sessão.' });
    },
    [signOut],
  );

  useEffect(() => {
    // O estado inicial já é "loading"; os setState ocorrem só depois da leitura assíncrona.
    void client.getAccessToken().then(resolveSession, sessionUnavailable);
    return client.onSessionChange((token) => {
      // Renovação recusada (sessão revogada ou expirada): volta ao login sem dados em memória.
      if (token === null && stateRef.current.status === 'signedIn') {
        queryClient.clear();
        setState({ status: 'signedOut', notice: SESSION_EXPIRED });
      }
    });
  }, [client, resolveSession, sessionUnavailable, queryClient]);

  /**
   * Executa a chamada com o token atual e trata 401, conta desativada e troca de senha. Um 401
   * (token recusado pelo servidor antes de processar a requisição) leva a uma renovação pelo E45 e
   * a uma única nova tentativa; se a renovação também for recusada, a sessão termina.
   */
  const withSession = useCallback(
    async <R,>(call: (token: string) => Promise<R>): Promise<R> => {
      const tokenOrNull = async (get: () => Promise<string | null>) => {
        try {
          return await get();
        } catch (error) {
          if (error instanceof ApiError && error.code === 'ACCOUNT_DISABLED') {
            await signOut(ACCOUNT_DISABLED);
          }
          throw error;
        }
      };
      const expired = async (): Promise<never> => {
        await signOut(SESSION_EXPIRED);
        throw new ApiError(401, 'UNAUTHENTICATED', SESSION_EXPIRED);
      };

      let token = await tokenOrNull(() => client.getAccessToken());
      if (token === null) return expired();
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await call(token);
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
          if (error.status === 401) {
            if (attempt > 0) return expired();
            const stale = token;
            token = await tokenOrNull(() => client.refreshAccessToken(stale));
            if (token === null) return expired();
            continue;
          }
          if (error.code === 'ACCOUNT_DISABLED') await signOut(ACCOUNT_DISABLED);
          else if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
            const me = stateRef.current.status === 'signedIn' ? stateRef.current.me : null;
            if (me !== null)
              setState({ status: 'signedIn', me: { ...me, mustChangePassword: true } });
          }
          throw error;
        }
      }
    },
    [client, signOut],
  );

  const request = useCallback(
    <T, M = undefined>(path: string, init: Omit<ApiRequestInit, 'token'> = {}) =>
      withSession((token) => apiRequest<T, M>(path, { ...init, token })),
    [withSession],
  );

  const download = useCallback(
    (path: string, fallbackName: string) =>
      withSession((token) => apiDownload(path, { token, fallbackName })),
    [withSession],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const result = await client.signIn(email.trim(), password);
      if (!result.ok) return { ok: false, message: SIGN_IN_MESSAGES[result.reason] };
      try {
        const me = await fetchMe(result.accessToken);
        queryClient.clear();
        setState({ status: 'signedIn', me });
        return { ok: true, me };
      } catch (error) {
        await client.signOut();
        // Conta sem perfil ou desativada: mesma mensagem genérica do login inválido.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return { ok: false, message: GENERIC_LOGIN_ERROR };
        }
        return { ok: false, message: SIGN_IN_MESSAGES.network };
      }
    },
    [client, queryClient],
  );

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async (newPassword) => {
      const current = stateRef.current;
      if (current.status !== 'signedIn')
        throw new ApiError(401, 'UNAUTHENTICATED', SESSION_EXPIRED);
      await request('/me/password', { method: 'POST', body: { newPassword } });
      // O E05 encerra as OUTRAS sessões e mantém a atual: basta recarregar o perfil (E04).
      const { data: me } = await request<Me>('/me');
      setState({ status: 'signedIn', me });
    },
    [request],
  );

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    await client.getAccessToken().then(resolveSession, sessionUnavailable);
  }, [client, resolveSession, sessionUnavailable]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, changePassword, reload, request, download }),
    [state, signIn, signOut, changePassword, reload, request, download],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
