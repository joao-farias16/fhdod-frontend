import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  MonitorPlay,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';

import { useAuth, useMe } from '../features/auth/auth-context';
import { can, homePathFor, ROLE_LABELS } from '../features/auth/auth-types';

/** Itens do menu montados a partir das permissões do E04 (RF05); o backend continua decidindo. */
const NAV_ITEMS = [
  { to: '/painel', label: 'Painel', permission: 'dashboard:read', Icon: LayoutDashboard },
  {
    to: '/ouvidoria/manifestacoes',
    label: 'Ouvidoria',
    permission: 'manifestations:read',
    Icon: MessagesSquare,
  },
  { to: '/relatorios', label: 'Relatórios', permission: 'reports:', Icon: FileSpreadsheet },
  { to: '/admin/pesquisas', label: 'Pesquisas', permission: 'surveys:read', Icon: ClipboardList },
  {
    to: '/admin/setores',
    label: 'Setores e equipes',
    permission: 'teams:create',
    Icon: Building2,
  },
  { to: '/admin/turnos', label: 'Escalas', permission: 'shifts:read', Icon: CalendarDays },
  { to: '/admin/usuarios', label: 'Usuários', permission: 'users:read', Icon: Users },
  { to: '/admin/auditoria', label: 'Auditoria', permission: 'audit_logs:read', Icon: ShieldCheck },
  // A TV Wall é pública (rota /tv); o item só facilita o acesso, sem exigir permissão.
  { to: '/tv', label: 'TV Wall', permission: null, Icon: MonitorPlay },
] as const;

/**
 * Layout das telas administrativas, em duas faixas: a barra vermelha institucional (logotipo,
 * usuário, Trocar senha e Sair) e a barra de navegação clara, com ícone e destaque da página
 * atual. Abaixo de 1024 px o menu vira o botão "Menu", com a lista em coluna.
 */
export function AdminLayout() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = me.mustChangePassword
    ? []
    : NAV_ITEMS.filter((item) =>
        item.permission === null
          ? true
          : // "reports:" = qualquer permissão de exportação (tipo conforme o perfil, Tabela 13).
            item.permission === 'reports:'
            ? me.permissions.some((permission) => permission.startsWith('reports:'))
            : can(me, item.permission),
      );

  const onSignOut = () => {
    void signOut().then(() => navigate('/login', { replace: true }));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>
      <header className="bg-brand-700 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link
            to={homePathFor(me)}
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-md text-white"
          >
            <img
              src="/images/logo-fhdod-oficial.png"
              alt="FHDOD"
              width="245"
              height="102"
              className="h-9 w-auto rounded-md min-[430px]:h-11 sm:h-12"
            />
            <span className="hidden border-l border-white/30 pl-3 text-sm leading-tight font-medium text-brand-100 xl:block">
              Gestão da Experiência
              <br />
              do Paciente
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:order-2 sm:ml-0 sm:gap-2">
            {me.mustChangePassword ? null : (
              <Link
                to="/trocar-senha"
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-brand-800 sm:px-3"
              >
                <KeyRound aria-hidden="true" className="size-4" />
                <span className="sr-only sm:not-sr-only">Trocar senha</span>
              </Link>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/60 px-2.5 text-sm font-medium hover:bg-brand-800 sm:gap-2 sm:px-3"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </button>
            {items.length > 0 ? (
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="menu-administrativo"
                onClick={() => {
                  setMenuOpen((open) => !open);
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-800 px-2.5 text-sm font-medium hover:bg-brand-800/80 sm:gap-2 sm:px-3 lg:hidden"
              >
                {menuOpen ? (
                  <X aria-hidden="true" className="size-5" />
                ) : (
                  <Menu aria-hidden="true" className="size-5" />
                )}
                Menu
              </button>
            ) : null}
          </div>

          {/* Usuário: antes das ações a partir de 640 px (order); no celular, linha própria abaixo. */}
          <p className="order-last w-full border-t border-white/25 pt-2 text-sm leading-tight sm:order-1 sm:ml-auto sm:w-auto sm:border-t-0 sm:border-r sm:border-white/30 sm:pt-0 sm:pr-4 sm:text-right">
            <span className="block font-semibold">{me.fullName}</span>
            <span className="text-brand-100">{ROLE_LABELS[me.role]}</span>
          </p>
        </div>
      </header>

      <div
        className={`border-b border-slate-200 bg-white shadow-xs ${items.length === 0 ? 'hidden' : ''} ${menuOpen ? '' : 'max-lg:hidden'}`}
      >
        <nav
          id="menu-administrativo"
          aria-label="Menu administrativo"
          className={`${menuOpen ? 'flex' : 'hidden'} mx-auto max-w-7xl flex-col gap-1 px-4 py-2 sm:px-6 lg:flex lg:flex-row lg:items-stretch lg:gap-1 lg:overflow-x-auto lg:py-0`}
        >
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                setMenuOpen(false);
              }}
              className={({ isActive }) =>
                `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors lg:min-h-12 lg:rounded-none lg:border-b-[3px] lg:px-3 ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 lg:border-brand-700 lg:bg-transparent'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 lg:border-transparent lg:hover:border-slate-300 lg:hover:bg-transparent'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main id="conteudo" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-slate-600 sm:px-6">
          Ambiente acadêmico — somente dados fictícios. Nenhum dado real de pacientes deve ser
          inserido.
        </p>
      </footer>
    </div>
  );
}
