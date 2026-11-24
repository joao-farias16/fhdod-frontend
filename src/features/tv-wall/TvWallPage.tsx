import {
  ArrowLeft,
  ChartNoAxesColumn,
  CircleAlert,
  Clock,
  LoaderCircle,
  QrCode,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import { TvTrendChart } from './TvTrendChart';
import {
  parseTvWallPeriod,
  TV_RELOAD_INTERVAL_MS,
  TV_STALE_AFTER_MS,
  type TvWallOverall,
  type TvWallSector,
  type TvWallSummary,
  useTvWallSummary,
} from './tv-wall-api';
import {
  longDate,
  PERIOD_LABELS,
  responsesText,
  tvNumber,
  tvPercent,
  tvTime,
} from './tv-wall-format';
import { useDocumentTitle, useNow, usePeriodicReload } from './tv-wall-hooks';

/*
 * Escala tipográfica (RF70). Em telas de TV (variante `tv:`, referência 1920 × 1080): NPS 160 px,
 * números 64 px, rótulos 32 px e mínimo 24 px. Em telas menores, a escala comum. Os atributos
 * data-tv-size identificam cada nível para a medição no DOM (T31).
 */
const HERO = 'text-7xl tv:text-tv-hero';
const NUMBER = 'text-4xl tv:text-tv-number';
const LABEL = 'text-2xl tv:text-tv-label';
const SMALL = 'text-lg tv:text-tv-small';

/** Cartão branco da TV: bordas e sombra leves sobre o fundo cinza-claro. */
const PANEL = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

/** Texto institucional fixo (convite da TL15); não depende de dados. */
const INVITATION = 'Sua opinião melhora o nosso atendimento.';
const INVITATION_DETAIL = 'Avalie o setor em que você foi atendido pelo QR Code do cartaz.';

function reloadPage() {
  window.location.reload();
}

function Header({ summary }: { summary: TvWallSummary | undefined }) {
  return (
    <header className="bg-brand-800 text-white">
      <div className="px-6 pt-2 tv:px-10">
        <Link
          to="/painel"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white tv:text-tv-small"
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0 tv:size-6" />
          Voltar à página principal
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3 tv:px-10">
        <h1 className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <img
            src="/images/logo-fhdod-oficial.png"
            alt="FHDOD"
            width="245"
            height="102"
            className="h-14 w-auto shrink-0 rounded-md sm:h-16 tv:h-20"
          />
          <span
            className={`${LABEL} font-semibold sm:border-l-2 sm:border-white/40 sm:pl-5`}
            data-tv-size="label"
          >
            Experiência do Paciente
          </span>
        </h1>
        {summary === undefined ? null : (
          <div className="text-left sm:text-right">
            <p className={`${LABEL} font-bold`} data-tv-size="label">
              {PERIOD_LABELS[summary.period.key]}
            </p>
            <p className={SMALL} data-tv-size="small">
              {longDate(summary.period.from)} a {longDate(summary.period.to)} · atualizado às{' '}
              {tvTime(summary.generatedAt)}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}

/** RF69: aviso visível de falha da API ou de dados desatualizados, com os últimos dados na tela. */
function StatusBanner({
  failed,
  stale,
  summary,
}: {
  failed: boolean;
  stale: boolean;
  summary: TvWallSummary;
}) {
  if (!failed && !stale) return null;
  const since = tvTime(summary.generatedAt);
  return (
    <div
      role="alert"
      className={`flex items-center gap-4 border-b-2 px-6 py-2 tv:px-10 ${
        failed
          ? 'border-danger-700 bg-red-50 text-red-950'
          : 'border-amber-700 bg-amber-50 text-amber-950'
      }`}
    >
      {failed ? (
        <CircleAlert aria-hidden="true" className="size-9 shrink-0 text-danger-700" />
      ) : (
        <Clock aria-hidden="true" className="size-9 shrink-0 text-amber-800" />
      )}
      <p className={SMALL} data-tv-size="small">
        <strong className={`${LABEL} font-bold`} data-tv-size="label">
          {failed ? 'Sem conexão com o servidor.' : 'Dados desatualizados.'}
        </strong>{' '}
        Exibindo os últimos dados recebidos, das {since}. Nova tentativa automática a cada minuto.
      </p>
    </div>
  );
}

/**
 * NPS geral, total de respostas e percentuais (RF68), respeitando a supressão (RF71): o NPS em
 * destaque com o total ao lado e, abaixo, promotores e detratores em dois cartões.
 */
function HospitalIndicators({ overall }: { overall: TvWallOverall }) {
  const noResponses = !overall.suppressed && overall.n === 0;
  const caption = overall.suppressed
    ? 'menos de 5 respostas'
    : noResponses
      ? 'sem respostas'
      : undefined;
  return (
    <section aria-labelledby="tv-hospital" className="flex flex-col gap-6">
      <div className={`${PANEL} border-t-8 border-t-brand-800 p-6 tv:px-8`}>
        <h2 id="tv-hospital" className={`${LABEL} font-bold`} data-tv-size="label">
          NPS geral do hospital
        </h2>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="min-w-0">
            {overall.suppressed ? (
              <>
                <p
                  className={`${NUMBER} font-bold text-slate-900`}
                  data-tv-size="number"
                  data-tv-value="nps"
                >
                  Menos de 5 respostas
                </p>
                <p className={`${SMALL} mt-2 text-slate-700`} data-tv-size="small">
                  O resultado aparece a partir de 5 respostas no período.
                </p>
              </>
            ) : overall.nps === null ? (
              <p
                className={`${NUMBER} font-bold text-slate-900`}
                data-tv-size="number"
                data-tv-value="nps"
              >
                Sem respostas no período
              </p>
            ) : (
              <p
                className={`${HERO} font-extrabold tracking-tight text-slate-900 tabular-nums`}
                data-tv-size="hero"
                data-tv-value="nps"
              >
                {tvNumber(overall.nps)}
              </p>
            )}
          </div>
          {overall.n === null ? null : (
            <p
              className={
                overall.nps === null
                  ? 'flex w-full flex-wrap items-baseline gap-x-4'
                  : 'flex flex-col items-start border-slate-200 sm:items-end sm:border-l-2 sm:pl-10 sm:text-right'
              }
            >
              <span
                className={`${NUMBER} font-bold text-slate-900 tabular-nums`}
                data-tv-size="number"
                data-tv-value="n"
              >
                {tvNumber(overall.n, 0)}
              </span>
              <span className={`${LABEL} text-slate-700`} data-tv-size="label">
                {overall.n === 1 ? 'resposta considerada' : 'respostas consideradas'}
              </span>
            </p>
          )}
        </div>
      </div>

      <dl className="grid gap-6 sm:grid-cols-2">
        {(
          [
            ['Promotores', 'notas 9 e 10', overall.promotersPercent, 'promoters'],
            ['Detratores', 'notas 0 a 6', overall.detractorsPercent, 'detractors'],
          ] as const
        ).map(([label, detail, value, key]) => (
          <div
            key={key}
            className={`${PANEL} flex gap-x-4 px-6 py-4 tv:px-8 ${
              caption === undefined
                ? 'flex-wrap items-center justify-between gap-y-1'
                : 'flex-col items-start gap-y-2'
            }`}
          >
            <dt className="flex flex-col">
              <span className={`${LABEL} font-semibold`} data-tv-size="label">
                {label}
              </span>
              <span className={`${SMALL} text-slate-700`} data-tv-size="small">
                {detail}
              </span>
            </dt>
            <dd
              className={
                caption === undefined
                  ? 'flex flex-col items-end text-right'
                  : 'flex flex-wrap items-baseline gap-x-4'
              }
            >
              <span
                className={`${NUMBER} font-bold tabular-nums`}
                data-tv-size="number"
                data-tv-value={key}
              >
                {tvPercent(value)}
              </span>
              {caption === undefined ? null : (
                <span className={`${SMALL} text-slate-700`} data-tv-size="small">
                  {caption}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Até 8 setores com 5 respostas ou mais, na ordem do E42 (RF68, RF71). */
function SectorList({ sectors, overall }: { sectors: TvWallSector[]; overall: TvWallOverall }) {
  return (
    <section
      aria-labelledby="tv-setores"
      className={`${PANEL} flex min-h-0 min-w-0 flex-col gap-3 p-6 tv:px-8`}
    >
      <h2 id="tv-setores" className={`${LABEL} font-bold`} data-tv-size="label">
        NPS por setor
      </h2>
      {sectors.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <ChartNoAxesColumn aria-hidden="true" className="size-12 text-slate-600 tv:size-16" />
          <p className={`${LABEL} font-semibold text-slate-900`} data-tv-size="label">
            {overall.n === 0
              ? 'Nenhuma resposta no período.'
              : 'Nenhum setor com 5 respostas ou mais no período.'}
          </p>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">
            NPS e quantidade de respostas por setor, do maior para o menor NPS
          </caption>
          {/* Cabeçalho só para leitores de tela (o recorte fica nos spans: células de tabela não
              aceitam o sr-only). */}
          <thead>
            <tr>
              <th scope="col" className="p-0">
                <span className="sr-only">Setor e respostas</span>
              </th>
              {/* Largura em em do próprio tamanho dos números: cabe "−100,0". */}
              <th scope="col" className={`${NUMBER} w-[3.5em] p-0`}>
                <span className="sr-only">NPS</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => (
              <tr key={sector.name} className="border-b-2 border-slate-100 last:border-b-0">
                <th scope="row" className="py-0.5 pr-4 text-left">
                  <span
                    className={`${LABEL} block font-semibold break-words lg:truncate`}
                    title={sector.name}
                    data-tv-size="label"
                    data-tv-sector={sector.name}
                  >
                    {sector.name}
                  </span>
                  <span
                    className={`${SMALL} block font-normal text-slate-700 tabular-nums`}
                    data-tv-size="small"
                  >
                    {responsesText(sector.n)}
                  </span>
                </th>
                <td
                  className={`${NUMBER} py-0.5 text-right align-middle font-bold tabular-nums`}
                  data-tv-size="number"
                  data-tv-value="sector-nps"
                >
                  {tvNumber(sector.nps)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p
        className={`${SMALL} mt-auto border-t-2 border-slate-100 pt-3 text-slate-700`}
        data-tv-size="small"
      >
        Setores com menos de 5 respostas não aparecem, para proteger o anonimato.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-4 border-brand-800 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-6 py-3 tv:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <QrCode aria-hidden="true" className="size-12 shrink-0 text-brand-800 tv:size-14" />
          <p className={`${SMALL} text-slate-800`} data-tv-size="small">
            <strong className={`${LABEL} block font-bold text-slate-900`} data-tv-size="label">
              {INVITATION}
            </strong>
            {INVITATION_DETAIL}
          </p>
        </div>
        <p className={`${SMALL} text-slate-700`} data-tv-size="small">
          Ambiente acadêmico — dados fictícios.
        </p>
      </div>
    </footer>
  );
}

function CenteredMessage({
  children,
  icon,
  alert,
}: {
  children: ReactNode;
  icon: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div
        className={`${PANEL} flex max-w-4xl flex-col items-center gap-5 px-10 py-12 text-center`}
      >
        {icon}
        <p role={alert === true ? 'alert' : 'status'} className={LABEL} data-tv-size="label">
          {children}
        </p>
      </div>
    </div>
  );
}

/**
 * TL15 — TV Wall (`/tv`, ET10): tela pública para TV, sem menu, sem sessão e sem outros links além do retorno a `/painel` (RF72).
 * Consome somente o E42 (RF68), a cada 60 s (RF69), mantendo os últimos dados válidos em falha e
 * recarregando a página a cada 6 h. `reload` é injetável para os testes.
 */
export function TvWallPage({ reload = reloadPage }: { reload?: () => void }) {
  const [params] = useSearchParams();
  const period = parseTvWallPeriod(params.get('periodo'));
  const query = useTvWallSummary(period);
  const now = useNow(15_000);
  const summary = query.data;

  // Sem dados na tela, recarregar não perde nada; com dados e API fora, a recarga espera.
  usePeriodicReload(TV_RELOAD_INTERVAL_MS, summary === undefined || !query.isError, reload);
  useDocumentTitle('TV Wall — FHDOD');

  const stale = summary !== undefined && now - query.dataUpdatedAt > TV_STALE_AFTER_MS;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 text-slate-900 tv:h-dvh">
      <Header summary={summary} />
      {summary === undefined ? (
        <main className="flex flex-1 flex-col">
          {query.isError ? (
            <CenteredMessage
              alert
              icon={
                <CircleAlert aria-hidden="true" className="size-14 text-danger-700 tv:size-16" />
              }
            >
              Não foi possível carregar os indicadores. Uma nova tentativa é feita automaticamente a
              cada minuto.
            </CenteredMessage>
          ) : (
            <CenteredMessage
              icon={
                <LoaderCircle
                  aria-hidden="true"
                  className="size-14 animate-spin text-brand-800 tv:size-16"
                />
              }
            >
              Carregando os indicadores…
            </CenteredMessage>
          )}
        </main>
      ) : (
        <>
          <StatusBanner failed={query.isError} stale={stale} summary={summary} />
          <main className="grid min-h-0 flex-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2 tv:gap-8 tv:px-10 tv:py-6">
            <div className="flex min-h-0 min-w-0 flex-col gap-6">
              <HospitalIndicators overall={summary.overall} />
              <div className={`${PANEL} flex min-h-0 flex-1 flex-col p-6 tv:px-8`}>
                <TvTrendChart
                  points={summary.trend.points}
                  granularity={summary.trend.granularity}
                />
              </div>
            </div>
            <SectorList sectors={summary.sectors} overall={summary.overall} />
          </main>
        </>
      )}
      <Footer />
    </div>
  );
}
