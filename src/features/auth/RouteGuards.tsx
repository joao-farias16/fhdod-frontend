import { ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';

import { buttonClasses } from '../../components/ui/button-classes';
import { ErrorState, Loading } from '../../components/ui/States';
import { useAuth, useMe } from './auth-context';
import { can, homePathFor } from './auth-types';

/**
 * Protege as rotas administrativas: sem sessão válida → /login; com troca de senha pendente →
 * /trocar-senha. É conveniência de navegação: o controle de acesso é sempre do backend.
 */
export function RequireAuth() {
  const { state, reload } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <Loading label="Verificando sua sessão…" />;
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <ErrorState error={new Error(state.message)} onRetry={() => void reload()} />
      </div>
    );
  }
  if (state.status === 'signedOut') {
    // Depois de Sair, o destino anterior não é guardado: quem entrar em seguida vai para a própria
    // tela inicial. Sessão expirada ou acesso direto sem login voltam à tela pedida.
    return (
      <Navigate
        to="/login"
        replace
        state={state.explicit === true ? null : { from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (state.me.mustChangePassword && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />;
  }
  return <Outlet />;
}

export function ForbiddenPage() {
  const me = useMe();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center space-y-4 px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-red-50 text-danger-700"
      >
        <ShieldX className="size-7" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acesso não permitido</h1>
      <p className="text-slate-600">Seu perfil não tem acesso a esta área.</p>
      <Link to={homePathFor(me)} className={buttonClasses('primary')}>
        Ir para a tela inicial
      </Link>
    </div>
  );
}

/** Mostra a tela somente se o perfil tiver a permissão recebida do E04. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const me = useMe();
  return can(me, permission) ? children : <ForbiddenPage />;
}
