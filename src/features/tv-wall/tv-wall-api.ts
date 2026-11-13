import { useQuery } from '@tanstack/react-query';

import { ApiError, apiGet } from '../../lib/api-client';

/**
 * TV Wall (TL15, ET10): dados do E42 — GET /api/v1/tv-wall/summary, público, sem login e sem
 * cookies (RF68–RF72). Tipos idênticos ao contrato da API (docs/tv-wall.md do repositório da API):
 * o frontend só exibe o que vem daqui, sem recalcular nem inferir valores suprimidos (RN21).
 */

export const TV_WALL_PERIODS = ['7d', '30d', '90d'] as const;
export type TvWallPeriod = (typeof TV_WALL_PERIODS)[number];
/** Padrão do E42: últimos 30 dias (RN25). */
export const DEFAULT_TV_WALL_PERIOD: TvWallPeriod = '30d';

/** RF69: consulta a cada 60 s, igual ao cache público de 60 s do E42 (Seção 9). */
export const TV_REFRESH_INTERVAL_MS = 60_000;
/** RF69: recarga completa da página a cada 6 horas. */
export const TV_RELOAD_INTERVAL_MS = 6 * 60 * 60 * 1000;
/**
 * Dados considerados desatualizados quando a última atualização bem-sucedida tem mais de 2,5 min
 * (duas consultas perdidas): o aviso aparece mesmo que nenhuma falha tenha sido registrada.
 */
export const TV_STALE_AFTER_MS = 150_000;

export interface TvWallOverall {
  n: number | null;
  nps: number | null;
  promotersPercent: number | null;
  detractorsPercent: number | null;
  /** RF71: total com 1 a 4 respostas — todos os valores acima vêm nulos. */
  suppressed: boolean;
}

export interface TvWallTrendPoint {
  start: string;
  end: string;
  n: number | null;
  nps: number | null;
  suppressed: boolean;
}

export interface TvWallSector {
  name: string;
  n: number;
  nps: number;
  promotersPercent: number;
  detractorsPercent: number;
}

export interface TvWallSummary {
  period: { key: TvWallPeriod; from: string; to: string };
  generatedAt: string;
  suppressionThreshold: number;
  overall: TvWallOverall;
  trend: { granularity: 'day' | 'week'; points: TvWallTrendPoint[] };
  sectors: TvWallSector[];
}

/** Período da URL (`/tv?periodo=7d`); qualquer outro valor usa o padrão. */
export function parseTvWallPeriod(value: string | null): TvWallPeriod {
  return (TV_WALL_PERIODS as readonly string[]).includes(value ?? '')
    ? (value as TvWallPeriod)
    : DEFAULT_TV_WALL_PERIOD;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isNullableNumber = (value: unknown) => value === null || isNumber(value);
const isLocalDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function isOverall(value: unknown): value is TvWallOverall {
  return (
    isObject(value) &&
    typeof value.suppressed === 'boolean' &&
    ['n', 'nps', 'promotersPercent', 'detractorsPercent'].every((key) =>
      isNullableNumber(value[key]),
    )
  );
}

function isTrendPoint(value: unknown): value is TvWallTrendPoint {
  return (
    isObject(value) &&
    isLocalDate(value.start) &&
    isLocalDate(value.end) &&
    isNullableNumber(value.n) &&
    isNullableNumber(value.nps) &&
    typeof value.suppressed === 'boolean'
  );
}

function isSector(value: unknown): value is TvWallSector {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    ['n', 'nps', 'promotersPercent', 'detractorsPercent'].every((key) => isNumber(value[key]))
  );
}

/** Confere a forma do conteúdo do E42 antes de exibi-lo. */
export function isTvWallSummary(value: unknown): value is TvWallSummary {
  if (!isObject(value) || !isObject(value.period) || !isObject(value.trend)) return false;
  return (
    (TV_WALL_PERIODS as readonly unknown[]).includes(value.period.key) &&
    isLocalDate(value.period.from) &&
    isLocalDate(value.period.to) &&
    typeof value.generatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.generatedAt)) &&
    isNumber(value.suppressionThreshold) &&
    isOverall(value.overall) &&
    (value.trend.granularity === 'day' || value.trend.granularity === 'week') &&
    Array.isArray(value.trend.points) &&
    value.trend.points.every(isTrendPoint) &&
    Array.isArray(value.sectors) &&
    value.sectors.every(isSector)
  );
}

/**
 * Copia somente os campos permitidos (RF72: "JSON por lista de campos permitidos"). A API já
 * envia só esses campos; a cópia garante que nada além deles chegue aos componentes.
 */
function pickAllowedFields(value: TvWallSummary): TvWallSummary {
  return {
    period: { key: value.period.key, from: value.period.from, to: value.period.to },
    generatedAt: value.generatedAt,
    suppressionThreshold: value.suppressionThreshold,
    overall: {
      n: value.overall.n,
      nps: value.overall.nps,
      promotersPercent: value.overall.promotersPercent,
      detractorsPercent: value.overall.detractorsPercent,
      suppressed: value.overall.suppressed,
    },
    trend: {
      granularity: value.trend.granularity,
      points: value.trend.points.map(({ start, end, n, nps, suppressed }) => ({
        start,
        end,
        n,
        nps,
        suppressed,
      })),
    },
    sectors: value.sectors.map(({ name, n, nps, promotersPercent, detractorsPercent }) => ({
      name,
      n,
      nps,
      promotersPercent,
      detractorsPercent,
    })),
  };
}

/** E42 com validação: conteúdo fora do contrato vira erro e não substitui os últimos dados. */
export async function fetchTvWallSummary(period: TvWallPeriod): Promise<TvWallSummary> {
  const data = await apiGet<unknown>(`/tv-wall/summary?period=${period}`);
  if (!isTvWallSummary(data)) {
    throw new ApiError(200, 'UNEXPECTED_RESPONSE', 'Resposta inesperada do servidor.');
  }
  return pickAllowedFields(data);
}

/** Uma nova tentativa rápida só para falhas transitórias; 400 e 429 aguardam o próximo ciclo. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return !(error instanceof ApiError && (error.status === 400 || error.status === 429));
}

/**
 * RF69 — consulta do E42 a cada 60 s:
 * - em falha, o TanStack Query mantém `data` (os últimos dados válidos) e marca `isError`;
 * - uma consulta por vez (consultas iguais são compartilhadas, sem requisições duplicadas);
 * - com a aba oculta, o intervalo pausa; ao voltar, consulta na hora se os dados tiverem mais de
 *   60 s (staleTime), sem consultar antes do fim do cache da API.
 * O AbortSignal do TanStack não é usado de propósito: com ele, a montagem dupla do StrictMode
 * cancelava a primeira consulta e fazia outra (duas requisições ao abrir a página). A TV Wall
 * não desmonta durante o uso, então não há o que cancelar.
 */
export function useTvWallSummary(period: TvWallPeriod) {
  return useQuery({
    queryKey: ['tv-wall', period],
    queryFn: () => fetchTvWallSummary(period),
    refetchInterval: TV_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: TV_REFRESH_INTERVAL_MS,
    retry: shouldRetry,
    retryDelay: 2_000,
  });
}
