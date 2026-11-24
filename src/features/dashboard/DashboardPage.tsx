import { useLocation } from 'react-router';

import { Alert } from '../../components/ui/Alert';
import { PageContainer, PageHeader } from '../../components/ui/Page';
import { ErrorState, Loading } from '../../components/ui/States';
import { formatLocalDate } from '../../lib/format';
import { noticeOf } from '../../lib/route-state';
import { useMe } from '../auth/auth-context';
import { ROLE_LABELS } from '../auth/auth-types';
import { ExportButtons } from '../reports/ExportButtons';
import {
  type DashboardFilters,
  useDashboardFilters,
  useSectorResults,
  useSummary,
  useTrends,
} from './dashboard-api';
import { DashboardFiltersForm } from './DashboardFiltersForm';
import {
  DistributionChart,
  GroupTable,
  NoData,
  Panel,
  SummaryCards,
  TrendChart,
} from './DashboardWidgets';

function periodTitle(filters: DashboardFilters): string {
  return `${formatLocalDate(filters.from)} a ${formatLocalDate(filters.to)}`;
}

/**
 * TL03 — Dashboard geral (/painel): filtros na URL, cartões com n, distribuição 0–10, setores,
 * tendência, comparação e exportação (RF50–RF53, RF55, RF56, RF58–RF62). Atualiza ao filtrar, pelo
 * botão Atualizar e a cada 60 s com a aba visível.
 */
export function DashboardPage() {
  const me = useMe();
  const location = useLocation();
  const notice = noticeOf(location.state);
  const { filters, compare, apply, clear } = useDashboardFilters();
  const summary = useSummary(filters, compare);
  const sectors = useSectorResults(filters);
  const trends = useTrends(filters);
  const refreshing = summary.isFetching || sectors.isFetching || trends.isFetching;

  const refresh = () => {
    void summary.refetch();
    void sectors.refetch();
    void trends.refetch();
  };

  let body;
  if (summary.isPending) {
    body = <Loading label="Carregando indicadores…" />;
  } else if (summary.isError) {
    body = <ErrorState error={summary.error} onRetry={refresh} />;
  } else if (summary.data.data.indicators.n === 0) {
    body = <NoData onClear={clear} />;
  } else {
    const data = summary.data.data;
    body = (
      <div className="space-y-6">
        <SummaryCards summary={data} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Distribuição das notas de 0 a 10">
            <DistributionChart summary={data} />
          </Panel>
          <Panel title="Tendência">
            {trends.isPending ? (
              <Loading />
            ) : trends.isError ? (
              <ErrorState error={trends.error} onRetry={() => void trends.refetch()} />
            ) : (
              <TrendChart points={trends.data.data} granularity={trends.data.meta.granularity} />
            )}
          </Panel>
        </div>
        <Panel
          title="Resultados por setor"
          description="Ordenados pelo NPS; setores sem respostas ficam ao final. Selecione um setor para ver perguntas, turnos e equipes."
        >
          {sectors.isPending ? (
            <Loading />
          ) : sectors.isError ? (
            <ErrorState error={sectors.error} onRetry={() => void sectors.refetch()} />
          ) : (
            <GroupTable
              caption="Resultados por setor"
              rows={sectors.data.data.map((sector) => ({
                key: sector.id,
                label: sector.isActive ? sector.name : `${sector.name} (desativado)`,
                href: `/painel/setores/${sector.id}${location.search}`,
                indicators: sector.indicators,
              }))}
            />
          )}
        </Panel>
      </div>
    );
  }

  return (
    <PageContainer>
      {notice === undefined ? null : <Alert tone="success">{notice}</Alert>}
      <PageHeader
        title={`Olá, ${me.fullName}`}
        description={
          <>
            Painel de indicadores · {periodTitle(filters)} · {ROLE_LABELS[me.role]}
            {me.role === 'viewer' ? ' · grupos com menos de 5 respostas ficam ocultos.' : ''}
          </>
        }
        actions={<ExportButtons filters={filters} />}
      >
        <p className="text-sm text-slate-600">
          Escopo:{' '}
          {me.allSectors
            ? 'todos os setores do hospital.'
            : me.sectors.length === 0
              ? 'nenhum setor associado. Procure o superadministrador.'
              : me.sectors.map((sector, index) => (
                  <span key={sector.id}>
                    {index === 0 ? '' : ', '}
                    <span>{sector.name}</span>
                    {sector.isActive ? '' : ' (setor desativado)'}
                  </span>
                ))}
        </p>
      </PageHeader>
      <DashboardFiltersForm
        key={`${JSON.stringify(filters)}-${String(compare)}`}
        filters={filters}
        compare={compare}
        onApply={apply}
        onClear={clear}
        onRefresh={refresh}
        refreshing={refreshing}
      />
      <div aria-live="polite" aria-busy={refreshing}>
        {body}
      </div>
    </PageContainer>
  );
}
