import { Eraser, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

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
import {
  addDays,
  daysInclusive,
  formatDateTime,
  formatLocalDate,
  localDateOf,
} from '../../lib/format';
import { useSectors } from '../sectors/sectors-api';
import {
  type ManifestationFilters,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  useManifestations,
} from './manifestations-api';

/** RN25: até 366 dias; padrão, últimos 30 dias. */
const MAX_DAYS = 366;

function defaultFilters(): ManifestationFilters {
  const today = localDateOf();
  return {
    from: addDays(today, -29),
    to: today,
    status: '',
    type: '',
    priority: '',
    sectorIds: '',
    protocol: '',
    hasContact: '',
    sort: 'received_desc',
  };
}

/**
 * TL12 — Lista de manifestações (/ouvidoria/manifestacoes, OU): filtros por status, tipo,
 * prioridade, setor, período, protocolo e contato (RF44). Mostra só o trecho de 120 caracteres e
 * se há contato; os dados de contato ficam no detalhe, por ação explícita (RF48).
 */
export function ManifestationsPage() {
  const [filters, setFilters] = useState<ManifestationFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const form = useForm<ManifestationFilters>({ defaultValues: filters });
  const sectors = useSectors();
  const list = useManifestations(filters, page);

  const apply = form.handleSubmit((values) => {
    setPage(1);
    setFilters(values);
  });

  const items = list.data?.data ?? [];
  const meta = list.data?.meta;

  return (
    <PageContainer>
      <PageHeader
        title="Manifestações"
        description="Elogios, reclamações e sugestões recebidas pela pesquisa, da mais recente para a mais antiga."
      />

      <FilterPanel
        label="Filtros das manifestações"
        columns={3}
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
              Limpar filtros
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
        <SelectField label="Status" {...form.register('status')}>
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Tipo" {...form.register('type')}>
          <option value="">Todos</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Prioridade" {...form.register('priority')}>
          <option value="">Todas</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Setor" {...form.register('sectorIds')}>
          <option value="">Todos do seu escopo</option>
          {(sectors.data ?? []).map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Protocolo"
          placeholder="FHD-AAAA-NNNNNN"
          maxLength={15}
          className="font-mono"
          error={form.formState.errors.protocol?.message}
          {...form.register('protocol', {
            validate: (value) =>
              value.trim() === '' ||
              /^FHD-\d{4}-\d{6}$/i.test(value.trim()) ||
              'Use o formato FHD-AAAA-NNNNNN.',
          })}
        />
        <SelectField label="Contato" {...form.register('hasContact')}>
          <option value="">Com ou sem contato</option>
          <option value="true">Com contato</option>
          <option value="false">Sem contato</option>
        </SelectField>
        <SelectField label="Ordenar por" {...form.register('sort')}>
          <option value="received_desc">Mais recentes primeiro</option>
          <option value="received_asc">Mais antigas primeiro</option>
          <option value="priority_desc">Maior prioridade</option>
          <option value="status_asc">Status</option>
        </SelectField>
      </FilterPanel>

      <section aria-labelledby="lista-titulo" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="lista-titulo" className="text-lg font-semibold text-slate-900">
            Recebidas de {formatLocalDate(filters.from)} a {formatLocalDate(filters.to)}
          </h2>
          {meta === undefined || items.length === 0 ? null : (
            <p className="text-sm text-slate-600">
              {meta.total} {meta.total === 1 ? 'manifestação' : 'manifestações'}
            </p>
          )}
        </div>
        {list.isPending ? (
          <Loading label="Carregando manifestações…" />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="Nenhuma manifestação encontrada">
            <p>Amplie o período ou limpe os filtros.</p>
          </EmptyState>
        ) : (
          <TableContainer label="Tabela de manifestações">
            <table className={`${TABLE_CLASS} ${STACK_TABLE_CLASS} min-w-[960px]`}>
              <thead className={THEAD_CLASS}>
                <tr>
                  {[
                    'Protocolo',
                    'Recebida em',
                    'Setor',
                    'Tipo',
                    'Status',
                    'Prioridade',
                    'Trecho',
                    'Contato',
                  ].map((label) => (
                    <th key={label} scope="col" className={TH_CLASS}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {items.map((item) => (
                  <tr key={item.id} className={TR_CLASS}>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <Link
                        to={`/ouvidoria/manifestacoes/${item.id}`}
                        className="inline-flex min-h-11 items-center font-mono font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
                      >
                        {item.protocol}
                      </Link>
                    </td>
                    <td
                      className={`${TD_CLASS} whitespace-nowrap tabular-nums`}
                      data-label="Recebida em"
                    >
                      {formatDateTime(item.receivedAt)}
                    </td>
                    <td className={TD_CLASS} data-label="Setor">
                      {item.sector.name}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap`} data-label="Tipo">
                      {TYPE_LABELS[item.type]}
                    </td>
                    <td className={`${TD_CLASS} font-medium whitespace-nowrap`} data-label="Status">
                      {STATUS_LABELS[item.status]}
                    </td>
                    <td className={`${TD_CLASS} whitespace-nowrap`} data-label="Prioridade">
                      {PRIORITY_LABELS[item.priority]}
                    </td>
                    <td
                      className={`${TD_CLASS} max-w-xs min-w-56 break-words text-slate-700`}
                      data-label="Trecho"
                    >
                      {item.excerpt}
                    </td>
                    <td className={TD_CLASS} data-label="Contato">
                      {item.hasContact ? 'Sim' : 'Não'}
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
