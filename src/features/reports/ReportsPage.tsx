import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { CheckboxField, SelectField } from '../../components/ui/Field';
import { Card, PageContainer, PageHeader } from '../../components/ui/Page';
import { ApiError } from '../../lib/api-client';
import { useMe } from '../auth/auth-context';
import { type DashboardFilters, defaultPeriod } from '../dashboard/dashboard-api';
import { DashboardFiltersForm } from '../dashboard/DashboardFiltersForm';
import { STATUS_LABELS, TYPE_LABELS } from '../manifestations/manifestations-api';
import { allowedReports, REPORT_LABELS, type ReportType, useExport } from './reports-api';

const DESCRIPTIONS: Record<ReportType, string> = {
  responses:
    'Abas Filtros, Indicadores, Respostas e Respostas por pergunta. Sem nome, telefone, e-mail ou texto livre.',
  indicators: 'Abas Filtros, Resumo, Por setor, Por pergunta e Tendência, iguais aos do painel.',
  manifestations:
    'Protocolo, datas, setor, tipo, status, prioridade, anonimato e se há contato. Os dados de contato nunca são exportados.',
};

function initialFilters(): DashboardFilters {
  return { ...defaultPeriod(), sectorIds: '', surveyId: '', period: '', teamIds: '', origin: '' };
}

/**
 * TL14 — Exportação de relatórios (/relatorios): tipo conforme a permissão do perfil, filtros
 * comuns e, para a Ouvidoria, status, tipo de manifestação e Incluir textos (RF63–RF67). Limites:
 * 10 exportações a cada 10 minutos e 50.000 linhas por aba (mensagens do backend).
 */
export function ReportsPage() {
  const me = useMe();
  const types = allowedReports(me);
  const [type, setType] = useState<ReportType>(types[0] ?? 'responses');
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [status, setStatus] = useState('');
  const [manifestationType, setManifestationType] = useState('');
  const [includeText, setIncludeText] = useState(false);
  const exporter = useExport();

  const generate = (current: DashboardFilters) => {
    setFilters(current);
    exporter.mutate({
      type,
      filters: current,
      ...(type === 'manifestations' ? { status, manifestationType, includeText } : {}),
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Relatórios"
        description="Gere planilhas do Excel com os filtros escolhidos. Datas no formato dd/mm/aaaa e horário de Brasília."
      />

      <Card title="Tipo de relatório" titleId="tipo-titulo">
        <SelectField
          fieldClassName="max-w-xl"
          label="Relatório"
          value={type}
          hint={DESCRIPTIONS[type]}
          onChange={(event) => {
            setType(event.target.value as ReportType);
            exporter.reset();
          }}
        >
          {types.map((value) => (
            <option key={value} value={value}>
              {REPORT_LABELS[value]}
            </option>
          ))}
        </SelectField>
        {type === 'manifestations' ? (
          <div className="grid items-start gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Tipo de manifestação"
              value={manifestationType}
              onChange={(event) => {
                setManifestationType(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <CheckboxField
              alignWithFields
              className="sm:col-span-2 lg:col-span-1"
              label="Incluir textos (descrição e providências)"
              checked={includeText}
              onChange={(event) => {
                setIncludeText(event.target.checked);
              }}
            />
          </div>
        ) : null}
      </Card>

      <DashboardFiltersForm
        key={JSON.stringify(filters)}
        filters={filters}
        submitLabel={exporter.isPending ? 'Gerando arquivo…' : 'Gerar arquivo Excel'}
        submitting={exporter.isPending}
        submitIcon={<FileSpreadsheet aria-hidden="true" className="size-4" />}
        onApply={(current) => {
          generate(current);
        }}
        onClear={() => {
          setFilters(initialFilters());
          exporter.reset();
        }}
      />

      <div aria-live="polite" className="space-y-3">
        {exporter.isError ? (
          <Alert
            tone="error"
            title="Não foi possível gerar o relatório"
            requestId={exporter.error instanceof ApiError ? exporter.error.requestId : undefined}
          >
            {exporter.error instanceof ApiError ? exporter.error.message : 'Tente novamente.'}
          </Alert>
        ) : null}
        {exporter.isSuccess ? <Alert tone="success">Arquivo gerado: {exporter.data}</Alert> : null}
      </div>
    </PageContainer>
  );
}
