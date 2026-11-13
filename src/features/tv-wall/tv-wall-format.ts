import { HOSPITAL_TIME_ZONE } from '../../lib/format';
import { formatNumber } from '../dashboard/dashboard-format';
import type { TvWallPeriod } from './tv-wall-api';

/**
 * Número da TV Wall em pt-BR (vírgula decimal, RNF29) com o sinal de menos tipográfico (−), mais
 * visível à distância que o hífen. Nulo → travessão (nunca 0, RF60).
 */
export function tvNumber(value: number | null, digits = 1): string {
  return formatNumber(value, digits).replace(/^-/, '−');
}

export function tvPercent(value: number | null): string {
  return value === null ? '—' : `${tvNumber(value)}%`;
}

/** Quantidade de respostas por extenso, com singular e plural. */
export function responsesText(n: number): string {
  return `${tvNumber(n, 0)} ${n === 1 ? 'resposta' : 'respostas'}`;
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: HOSPITAL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Hora local do hospital (hh:mm) de um instante ISO 8601 ou em milissegundos. */
export function tvTime(instant: string | number): string {
  return timeFormatter.format(new Date(instant));
}

/** AAAA-MM-DD → dd/mm (rótulos curtos do gráfico). */
export function shortDate(date: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${day}/${month}`;
}

/** AAAA-MM-DD → dd/mm/aaaa. */
export function longDate(date: string): string {
  const [year = '', month = '', day = ''] = date.split('-');
  return `${day}/${month}/${year}`;
}

export const PERIOD_LABELS: Record<TvWallPeriod, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};
