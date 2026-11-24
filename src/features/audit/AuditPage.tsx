import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eraser, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { FilterPanel, PageContainer, PageHeader } from '../../components/ui/Page';
import { EmptyState, ErrorState, Loading, Pagination } from '../../components/ui/States';
import {
  STACK_TABLE_CLASS,
  TABLE_CLASS,
  TableContainer,
  TBODY_CLASS,
  TD_CLASS,
  TH_CLASS,
  THEAD_CLASS,
  TR_CLASS,
} from '../../components/ui/Table';
import { type PageMeta, toQueryString } from '../../lib/api-client';
import {
  addDays,
  daysInclusive,
  formatDateTime,
  formatLocalDate,
  localDateOf,
} from '../../lib/format';
import { useAuth } from '../auth/auth-context';
import { ROLE_LABELS, type UserRole } from '../auth/auth-types';
import { useSectors } from '../sectors/sectors-api';
import type { AdminUser } from '../users/users-api';
import { ACTION_LABELS, describeDetails, ENTITY_LABELS } from './audit-labels';

interface AuditLog {
  id: string;
  occurredAt: string;
  actor: { id: string; fullName: string; role: UserRole | null } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  sectorId: string | null;
  details: unknown;
  requestId: string | null;
}

interface AuditFilters {
  from: string;
  to: string;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId: string;
  pageSize: string;
}

type AuditMeta = PageMeta & { from: string; to: string };

/** RN25: até 366 dias; padrão, últimos 30 dias. RF11: até 100 por página. */
const MAX_DAYS = 366;

function defaultFilters(): AuditFilters {
  const today = localDateOf();
  return {
    from: addDays(today, -29),
    to: today,
    actorProfileId: '',
    action: '',
    entityType: '',
    entityId: '',
    pageSize: '50',
  };
}

/** TL17 — Auditoria (/admin/auditoria, SA): eventos com filtros por período, autor, ação e entidade. */
export function AuditPage() {
  const { request } = useAuth();
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const form = useForm<AuditFilters>({ defaultValues: filters });
  const sectors = useSectors();

  const logs = useQuery({
    queryKey: ['admin', 'audit-logs', filters, page],
    queryFn: () =>
      request<AuditLog[], AuditMeta>(
        `/admin/audit-logs${toQueryString({ ...filters, entityId: filters.entityId.trim(), page })}`,
      ),
    placeholderData: keepPreviousData,
  });
  const authors = useQuery({
    queryKey: ['admin', 'users', 'autores'],
    queryFn: async () => (await request<AdminUser[], PageMeta>('/admin/users?pageSize=100')).data,
  });

  const sectorName = (id: string) => sectors.data?.find((sector) => sector.id === id)?.name ?? id;

  const apply = form.handleSubmit((values) => {
    setPage(1);
    setFilters(values);
  });

  const items = logs.data?.data ?? [];
  const meta = logs.data?.meta;

  return (
    <PageContainer>
      <PageHeader
        title="Auditoria"
        description="Operações sensíveis e acessos negados, do mais recente para o mais antigo. A trilha não pode ser alterada."
      />

      <FilterPanel
        label="Filtros da auditoria"
        onSubmit={(event) => void apply(event)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const initial = defaultFilters();
                form.reset(initial);
                setPage(1);
                setFilters(initial);
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
          label="De"
          type="date"
          error={form.formState.errors.from?.message}
          {...form.register('from', {
            required: 'Informe a data inicial.',
            validate: (value, values) => {
              if (value > values.to) return 'A data inicial deve ser anterior ou igual à final.';
              return (
                daysInclusive(value, values.to) <= MAX_DAYS ||
                `O período deve ter no máximo ${MAX_DAYS} dias.`
              );
            },
          })}
        />
        <TextField
          label="Até"
          type="date"
          error={form.formState.errors.to?.message}
          {...form.register('to', { required: 'Informe a data final.' })}
        />
        <SelectField label="Autor" {...form.register('actorProfileId')}>
          <option value="">Todos</option>
          {(authors.data ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </SelectField>
        <SelectField label="Ação" {...form.register('action')}>
          <option value="">Todas</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Entidade" {...form.register('entityType')}>
          <option value="">Todas</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Identificador da entidade"
          placeholder="Código copiado de um evento"
          maxLength={64}
          fieldClassName="sm:col-span-2"
          className="font-mono text-sm"
          {...form.register('entityId')}
        />
        <SelectField label="Itens por página" {...form.register('pageSize')}>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </SelectField>
      </FilterPanel>

      <section aria-labelledby="eventos-titulo" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="eventos-titulo" className="text-lg font-semibold text-slate-900">
            Eventos de {formatLocalDate(filters.from)} a {formatLocalDate(filters.to)}
          </h2>
          {meta === undefined || items.length === 0 ? null : (
            <p className="text-sm text-slate-600">
              {meta.total} {meta.total === 1 ? 'evento' : 'eventos'}
            </p>
          )}
        </div>
        {logs.isPending ? (
          <Loading label="Carregando eventos…" />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="Nenhum evento encontrado">
            <p>Amplie o período ou limpe os filtros.</p>
          </EmptyState>
        ) : (
          <TableContainer label="Tabela de eventos de auditoria">
            <table className={`${TABLE_CLASS} ${STACK_TABLE_CLASS} min-w-[880px]`}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th scope="col" className={`${TH_CLASS} w-40`}>
                    Data e hora
                  </th>
                  <th scope="col" className={`${TH_CLASS} w-52`}>
                    Autor
                  </th>
                  <th scope="col" className={`${TH_CLASS} w-48`}>
                    Ação
                  </th>
                  <th scope="col" className={`${TH_CLASS} w-56`}>
                    Entidade
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {items.map((log) => (
                  <tr key={log.id} className={TR_CLASS}>
                    <td
                      className={`${TD_CLASS} font-semibold whitespace-nowrap tabular-nums md:font-normal`}
                    >
                      {formatDateTime(log.occurredAt)}
                    </td>
                    <td className={TD_CLASS} data-label="Autor">
                      {log.actor === null ? (
                        <span className="text-slate-600">Sistema</span>
                      ) : (
                        <>
                          <span className="block font-semibold text-slate-900">
                            {log.actor.fullName}
                          </span>
                          <span className="text-slate-600">
                            {log.actor.role === null ? '' : ROLE_LABELS[log.actor.role]}
                          </span>
                        </>
                      )}
                    </td>
                    <td className={`${TD_CLASS} font-medium text-slate-900`} data-label="Ação">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className={TD_CLASS} data-label="Entidade">
                      <span className="block">
                        {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      </span>
                      {log.entityId === null ? null : (
                        <span
                          className="mt-1 inline-block max-w-full rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs break-all text-slate-700"
                          title="Identificador da entidade"
                        >
                          {log.entityId}
                        </span>
                      )}
                    </td>
                    <td className={TD_CLASS} data-label="Detalhes">
                      <ul className="space-y-0.5 text-slate-800">
                        {describeDetails(log.details, sectorName).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      {log.requestId === null ? null : (
                        <span className="mt-1.5 block font-mono text-xs break-all text-slate-600">
                          Requisição {log.requestId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
        {meta === undefined || items.length === 0 ? null : (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
          />
        )}
      </section>
    </PageContainer>
  );
}
