import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CARD_CLASS, FilterPanel, PageContainer, PageHeader } from '../../components/ui/Page';
import { Dialog } from '../../components/ui/Dialog';
import { SelectField, TextField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Loading, Pagination } from '../../components/ui/States';
import { Tag } from '../../components/ui/Tag';
import { applyApiError, type Failure } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { useSectors } from '../sectors/sectors-api';
import {
  STATUS_LABELS,
  STATUS_TONES,
  type SurveyCreate,
  type SurveysFilters,
  type SurveyStatus,
  useCreateSurvey,
  useSurveys,
} from './surveys-api';

/** Sugestão de endereço a partir do título: minúsculas, sem acentos, com hífens. */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function CreateSurveyDialog({ onClose }: { onClose: () => void }) {
  const sectors = useSectors();
  const create = useCreateSurvey();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<Failure | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<SurveyCreate>({
    defaultValues: { sectorId: '', title: '', slug: '', introText: '', thankYouMessage: '' },
  });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const created = await create.mutateAsync({
        sectorId: values.sectorId,
        title: values.title.trim(),
        slug: values.slug.trim(),
        ...(values.introText?.trim() ? { introText: values.introText.trim() } : {}),
        ...(values.thankYouMessage?.trim()
          ? { thankYouMessage: values.thankYouMessage.trim() }
          : {}),
      });
      void navigate(`/admin/pesquisas/${created.id}`, {
        state: { notice: 'Pesquisa criada em rascunho com a pergunta geral de 0 a 10.' },
      });
    } catch (error) {
      setFailure(
        applyApiError(
          error,
          ['sectorId', 'title', 'slug', 'introText', 'thankYouMessage'],
          setError,
          'slug',
        ),
      );
    }
  });
  const titleField = register('title', {
    validate: (value) =>
      (value.trim().length >= 3 && value.trim().length <= 120) ||
      'O título deve ter de 3 a 120 caracteres.',
  });

  return (
    <Dialog
      open
      size="lg"
      title="Nova pesquisa"
      description="A pesquisa nasce em rascunho, com a pergunta geral de 0 a 10. O link só funciona depois de publicar."
      onClose={onClose}
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        {failure === null ? null : (
          <Alert tone="error" requestId={failure.requestId}>
            {failure.text}
          </Alert>
        )}
        <SelectField
          label="Setor"
          error={errors.sectorId?.message}
          {...register('sectorId', { required: 'Escolha o setor.' })}
        >
          <option value="">Selecione…</option>
          {(sectors.data ?? [])
            .filter((sector) => sector.isActive)
            .map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
        </SelectField>
        <TextField
          label="Título"
          error={errors.title?.message}
          {...titleField}
          onChange={(event) => {
            void titleField.onChange(event);
            if (dirtyFields.slug !== true) setValue('slug', slugify(getValues('title')));
          }}
        />
        <TextField
          label="Endereço (slug)"
          hint="Letras minúsculas, números e hífens. Não muda depois da primeira publicação."
          error={errors.slug?.message}
          {...register('slug', {
            validate: (value) =>
              (SLUG_PATTERN.test(value.trim()) && value.trim().length <= 80) ||
              'Use letras minúsculas, números e hífens (exemplo: pronto-atendimento).',
          })}
        />
        <TextField label="Introdução (opcional)" maxLength={500} {...register('introText')} />
        <TextField
          label="Agradecimento (opcional)"
          hint="Exibido depois do envio. Em branco, usa o texto padrão."
          maxLength={500}
          {...register('thankYouMessage')}
        />
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Criando…' : 'Criar rascunho'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const INITIAL: SurveysFilters = { sectorId: '', status: '', search: '', page: 1, pageSize: 20 };

/** TL08 — lista de pesquisas (/admin/pesquisas; RF25, RF32), com situação e versão vigente. */
export function SurveysPage() {
  const [filters, setFilters] = useState<SurveysFilters>(INITIAL);
  const [creating, setCreating] = useState(false);
  const surveys = useSurveys(filters);
  const sectors = useSectors();
  const list = surveys.data?.data ?? [];
  const meta = surveys.data?.meta;

  return (
    <PageContainer>
      <PageHeader
        title="Pesquisas"
        description="Configuração, publicação de versões, link e QR Code por setor."
        actions={
          <Button
            onClick={() => {
              setCreating(true);
            }}
          >
            <Plus aria-hidden="true" className="size-5" />
            Nova pesquisa
          </Button>
        }
      />

      <FilterPanel
        label="Filtros de pesquisas"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <SelectField
          label="Setor"
          value={filters.sectorId}
          onChange={(event) => {
            setFilters({ ...filters, sectorId: event.target.value, page: 1 });
          }}
        >
          <option value="">Todos</option>
          {(sectors.data ?? []).map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Situação"
          value={filters.status}
          onChange={(event) => {
            setFilters({ ...filters, status: event.target.value as SurveyStatus | '', page: 1 });
          }}
        >
          <option value="">Todas</option>
          {(Object.keys(STATUS_LABELS) as SurveyStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Buscar por título ou endereço"
          type="search"
          fieldClassName="sm:col-span-2"
          value={filters.search}
          maxLength={120}
          onChange={(event) => {
            setFilters({ ...filters, search: event.target.value, page: 1 });
          }}
        />
      </FilterPanel>

      <section aria-labelledby="lista-pesquisas" className="space-y-4">
        <h2 id="lista-pesquisas" className="sr-only">
          Lista de pesquisas
        </h2>
        {surveys.isPending ? (
          <Loading label="Carregando pesquisas…" />
        ) : surveys.isError ? (
          <ErrorState error={surveys.error} onRetry={() => void surveys.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState title="Nenhuma pesquisa encontrada">
            <p>Crie uma pesquisa para um setor do seu escopo.</p>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((survey) => (
              <li
                key={survey.id}
                className={`${CARD_CLASS} flex flex-col gap-2 p-5 transition-colors hover:border-slate-300`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={STATUS_TONES[survey.status]}>{STATUS_LABELS[survey.status]}</Tag>
                  {survey.hasUnpublishedChanges && survey.currentVersion !== null ? (
                    <span className="text-sm text-slate-700">Alterações não publicadas</span>
                  ) : null}
                </div>
                <Link
                  to={`/admin/pesquisas/${survey.id}`}
                  className="block text-lg leading-snug font-semibold text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline"
                >
                  {survey.title}
                </Link>
                <p className="text-sm text-slate-700">
                  {survey.sectorName} · /p/{survey.slug} · {survey.activeSpecificQuestions}{' '}
                  perguntas específicas ativas
                </p>
                <p className="text-sm text-slate-700">
                  {survey.currentVersion === null
                    ? 'Ainda não publicada'
                    : `Versão ${survey.currentVersion.versionNumber} publicada em ${formatDateTime(survey.currentVersion.publishedAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
        {meta === undefined || list.length === 0 ? null : (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={(page) => {
              setFilters({ ...filters, page });
            }}
          />
        )}
      </section>

      {creating ? (
        <CreateSurveyDialog
          onClose={() => {
            setCreating(false);
          }}
        />
      ) : null}
    </PageContainer>
  );
}
