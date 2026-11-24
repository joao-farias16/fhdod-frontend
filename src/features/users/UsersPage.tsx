import { Eraser, KeyRound, Pencil, Power, PowerOff, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField, TextField } from '../../components/ui/Field';
import { FilterPanel, PageContainer, PageHeader } from '../../components/ui/Page';
import { EmptyState, ErrorState, Loading, Pagination } from '../../components/ui/States';
import {
  STACK_TABLE_CLASS,
  TABLE_CLASS,
  TableContainer,
  TBODY_CLASS,
  TD_ACTIONS_CLASS,
  TD_CLASS,
  TH_CLASS,
  THEAD_CLASS,
  TR_CLASS,
} from '../../components/ui/Table';
import { Tag } from '../../components/ui/Tag';
import { failureOf } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { noticeOf } from '../../lib/route-state';
import { useMe } from '../auth/auth-context';
import { ROLE_LABELS, type UserRole } from '../auth/auth-types';
import { useSectors } from '../sectors/sectors-api';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';
import { UserFormDialog } from './UserFormDialog';
import {
  type AdminUser,
  useCreateUser,
  useResetPassword,
  type UserInput,
  type UsersFilters,
  useUpdateUser,
  useUsers,
} from './users-api';

const PAGE_SIZE = 20;
const INITIAL_FILTERS: UsersFilters = {
  search: '',
  role: '',
  isActive: '',
  sectorId: '',
  page: 1,
  pageSize: PAGE_SIZE,
};

type Pending =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'toggle'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | null;

function scopeText(user: AdminUser): string {
  if (user.allSectors) return 'Todos os setores';
  if (user.sectors.length === 0) return 'Nenhum setor';
  return user.sectors
    .map((sector) => `${sector.name}${sector.isActive ? '' : ' (desativado)'}`)
    .join(', ');
}

/** TL16 — Gestão de usuários (/admin/usuarios, SA): cadastro, edição, desativação e senha. */
export function UsersPage() {
  const me = useMe();
  const location = useLocation();
  const [filters, setFilters] = useState<UsersFilters>(INITIAL_FILTERS);
  const [pending, setPending] = useState<Pending>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(noticeOf(location.state) ?? null);
  const [temporary, setTemporary] = useState<{ password: string; userName: string } | null>(null);

  const users = useUsers(filters);
  const sectors = useSectors();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();

  const filterForm = useForm<Omit<UsersFilters, 'page' | 'pageSize'>>({
    defaultValues: INITIAL_FILTERS,
  });
  const applyFilters = filterForm.handleSubmit((values) => {
    setFilters({ ...values, search: values.search.trim(), page: 1, pageSize: PAGE_SIZE });
  });

  const close = () => {
    setPending(null);
    setActionError(null);
  };

  const submitForm = async (input: UserInput) => {
    setSuccess(null);
    if (pending?.kind === 'edit') {
      await updateUser.mutateAsync({ id: pending.user.id, input });
      setSuccess(`Dados de ${input.fullName ?? pending.user.fullName} atualizados.`);
    } else {
      const result = await createUser.mutateAsync(input);
      setTemporary({ password: result.temporaryPassword, userName: result.user.fullName });
      setSuccess(`Usuário ${result.user.fullName} cadastrado.`);
    }
    setPending(null);
  };

  const confirmToggle = async (user: AdminUser) => {
    setActionError(null);
    try {
      await updateUser.mutateAsync({ id: user.id, input: { isActive: !user.isActive } });
      setSuccess(
        user.isActive
          ? `Usuário ${user.fullName} desativado.`
          : `Usuário ${user.fullName} reativado.`,
      );
      setPending(null);
    } catch (error) {
      setActionError(failureOf(error).text);
    }
  };

  const confirmReset = async (user: AdminUser) => {
    setActionError(null);
    try {
      const result = await resetPassword.mutateAsync(user.id);
      setPending(null);
      setTemporary({ password: result.temporaryPassword, userName: user.fullName });
      setSuccess(
        `Senha de ${user.fullName} redefinida. A troca será obrigatória no próximo acesso.`,
      );
    } catch (error) {
      setActionError(failureOf(error).text);
    }
  };

  const list = users.data?.data ?? [];
  const meta = users.data?.meta;

  return (
    <PageContainer>
      <PageHeader
        title="Gestão de usuários"
        description="Contas administrativas, perfis, escopo de setores e senhas temporárias."
        actions={
          <Button
            onClick={() => {
              setSuccess(null);
              setPending({ kind: 'create' });
            }}
          >
            <UserPlus aria-hidden="true" className="size-5" />
            Novo usuário
          </Button>
        }
      />

      {success === null ? null : <Alert tone="success">{success}</Alert>}

      <FilterPanel
        label="Filtros de usuários"
        columns={5}
        onSubmit={(event) => void applyFilters(event)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                filterForm.reset(INITIAL_FILTERS);
                setFilters(INITIAL_FILTERS);
              }}
            >
              <Eraser aria-hidden="true" className="size-4" />
              Limpar
            </Button>
            <Button type="submit">
              <Search aria-hidden="true" className="size-4" />
              Filtrar
            </Button>
          </>
        }
      >
        <TextField
          label="Buscar por nome ou e-mail"
          type="search"
          placeholder="Digite parte do nome ou do e-mail"
          maxLength={120}
          fieldClassName="sm:col-span-2"
          {...filterForm.register('search')}
        />
        <SelectField label="Perfil" {...filterForm.register('role')}>
          <option value="">Todos</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Situação" {...filterForm.register('isActive')}>
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Desativados</option>
        </SelectField>
        <SelectField
          label="Setor"
          fieldClassName="sm:col-span-2 lg:col-span-1"
          {...filterForm.register('sectorId')}
        >
          <option value="">Todos</option>
          {(sectors.data ?? []).map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </SelectField>
      </FilterPanel>

      <section aria-labelledby="lista-usuarios" className="space-y-4">
        <h2 id="lista-usuarios" className="sr-only">
          Lista de usuários
        </h2>
        {users.isPending ? (
          <Loading label="Carregando usuários…" />
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState title="Nenhum usuário encontrado">
            <p>Ajuste os filtros ou cadastre um novo usuário.</p>
          </EmptyState>
        ) : (
          <TableContainer label="Tabela de usuários">
            <table className={`${TABLE_CLASS} ${STACK_TABLE_CLASS} min-w-[960px]`}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th scope="col" className={TH_CLASS}>
                    Nome
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Perfil
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Escopo
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Situação
                  </th>
                  <th scope="col" className={`${TH_CLASS} text-right`}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {list.map((user) => {
                  const isSelf = user.id === me.id;
                  return (
                    <tr key={user.id} className={TR_CLASS}>
                      <td className={`${TD_CLASS} min-w-56`}>
                        <span className="block font-semibold text-slate-900">
                          {user.fullName}
                          {isSelf ? ' (você)' : ''}
                        </span>
                        <span className="block break-all text-slate-600">{user.email}</span>
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap`} data-label="Perfil">
                        {ROLE_LABELS[user.role]}
                      </td>
                      <td className={`${TD_CLASS} max-w-64 text-slate-700`} data-label="Escopo">
                        {scopeText(user)}
                      </td>
                      <td className={TD_CLASS} data-label="Situação">
                        <div className="flex flex-col items-start gap-1">
                          <Tag tone={user.isActive ? 'success' : 'neutral'}>
                            {user.isActive ? 'Ativo' : 'Desativado'}
                          </Tag>
                          {user.deactivatedAt === null ? null : (
                            <span className="text-xs text-slate-600">
                              desde {formatDateTime(user.deactivatedAt)}
                            </span>
                          )}
                          {user.mustChangePassword ? (
                            <Tag tone="info">Troca de senha pendente</Tag>
                          ) : null}
                        </div>
                      </td>
                      <td className={TD_ACTIONS_CLASS} data-actions="">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            className="px-3"
                            aria-label={`Editar ${user.fullName}`}
                            onClick={() => {
                              setSuccess(null);
                              setPending({ kind: 'edit', user });
                            }}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                            Editar
                          </Button>
                          {isSelf ? null : (
                            <>
                              <Button
                                variant="ghost"
                                className="px-3"
                                aria-label={`Redefinir senha de ${user.fullName}`}
                                disabled={!user.isActive}
                                title={
                                  user.isActive
                                    ? undefined
                                    : 'Reative o usuário antes de redefinir a senha.'
                                }
                                onClick={() => {
                                  setSuccess(null);
                                  setPending({ kind: 'reset', user });
                                }}
                              >
                                <KeyRound aria-hidden="true" className="size-4" />
                                Redefinir senha
                              </Button>
                              <Button
                                variant="ghost"
                                className={`px-3 ${user.isActive ? 'text-danger-700 hover:bg-red-50 hover:text-danger-800' : ''}`}
                                aria-label={`${user.isActive ? 'Desativar' : 'Reativar'} ${user.fullName}`}
                                onClick={() => {
                                  setSuccess(null);
                                  setPending({ kind: 'toggle', user });
                                }}
                              >
                                {user.isActive ? (
                                  <PowerOff aria-hidden="true" className="size-4" />
                                ) : (
                                  <Power aria-hidden="true" className="size-4" />
                                )}
                                {user.isActive ? 'Desativar' : 'Reativar'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
        {meta === undefined || list.length === 0 ? null : (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={(page) => {
              setFilters((current) => ({ ...current, page }));
            }}
          />
        )}
      </section>

      {pending?.kind === 'create' || pending?.kind === 'edit' ? (
        <UserFormDialog
          open
          user={pending.kind === 'edit' ? pending.user : undefined}
          isSelf={pending.kind === 'edit' && pending.user.id === me.id}
          onClose={close}
          onSubmit={submitForm}
        />
      ) : null}

      <ConfirmDialog
        open={pending?.kind === 'toggle'}
        title={
          pending?.kind === 'toggle' && pending.user.isActive
            ? 'Desativar usuário'
            : 'Reativar usuário'
        }
        confirmLabel={
          pending?.kind === 'toggle' && pending.user.isActive ? 'Desativar' : 'Reativar'
        }
        danger={pending?.kind === 'toggle' && pending.user.isActive}
        busy={updateUser.isPending}
        error={actionError}
        onClose={close}
        onConfirm={() => {
          if (pending?.kind === 'toggle') void confirmToggle(pending.user);
        }}
      >
        {pending?.kind === 'toggle'
          ? pending.user.isActive
            ? `${pending.user.fullName} perderá o acesso imediatamente, inclusive nas sessões abertas. O histórico é mantido.`
            : `${pending.user.fullName} poderá entrar novamente com a senha atual.`
          : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Redefinir senha"
        confirmLabel="Gerar senha temporária"
        busy={resetPassword.isPending}
        error={actionError}
        onClose={close}
        onConfirm={() => {
          if (pending?.kind === 'reset') void confirmReset(pending.user);
        }}
      >
        {pending?.kind === 'reset'
          ? `A senha atual de ${pending.user.fullName} deixará de funcionar e uma senha temporária será gerada.`
          : null}
      </ConfirmDialog>

      <TemporaryPasswordDialog
        password={temporary?.password ?? null}
        userName={temporary?.userName ?? ''}
        onClose={() => {
          setTemporary(null);
        }}
      />
    </PageContainer>
  );
}
