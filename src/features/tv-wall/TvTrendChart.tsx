import { useId } from 'react';

import type { TvWallTrendPoint } from './tv-wall-api';
import { longDate, shortDate, tvNumber } from './tv-wall-format';

/** Área de desenho (unidades do viewBox; a escala é uniforme, então as posições em % coincidem). */
const WIDTH = 1000;
const HEIGHT = 300;
const PAD_X = 20;
const PAD_Y = 24;
const INNER_W = WIDTH - 2 * PAD_X;
const INNER_H = HEIGHT - 2 * PAD_Y;
const TICKS = [100, 0, -100] as const;

const y = (nps: number) => PAD_Y + ((100 - nps) / 200) * INNER_H;

function intervalText(point: TvWallTrendPoint): string {
  return point.start === point.end
    ? longDate(point.start)
    : `${longDate(point.start)} a ${longDate(point.end)}`;
}

function pointText(point: TvWallTrendPoint): string {
  if (point.suppressed) return 'oculto (menos de 5 respostas)';
  if (point.nps === null) return 'sem respostas';
  return `NPS ${tvNumber(point.nps)} (${tvNumber(point.n, 0)} respostas)`;
}

/**
 * RF68/RF59 — tendência do NPS (−100 a 100), um ponto por intervalo, como devolvido pelo E42.
 * Pontos sem respostas ou suprimidos (RN21) ficam vazios: a linha é interrompida e nenhum valor
 * é inventado. O SVG não tem texto; eixos e datas são HTML (24 px na TV, RF70). Para leitores de
 * tela, a série completa está em uma tabela.
 */
export function TvTrendChart({
  points,
  granularity,
}: {
  points: TvWallTrendPoint[];
  granularity: 'day' | 'week';
}) {
  const ids = useId();
  const unit = granularity === 'day' ? 'por dia' : 'por semana';
  const x = (index: number) =>
    PAD_X + (points.length <= 1 ? INNER_W / 2 : (index / (points.length - 1)) * INNER_W);

  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    if (point.nps === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(
      `${current.length === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.nps).toFixed(1)}`,
    );
  });
  if (current.length > 1) segments.push(current.join(' '));

  const first = points[0];
  const last = points.at(-1);
  const hasValues = points.some((point) => point.nps !== null);

  return (
    <figure aria-labelledby={`${ids}-titulo`} className="flex min-h-0 flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span id={`${ids}-titulo`} className="text-2xl font-bold tv:text-tv-label">
          Tendência do NPS
        </span>
        <span className="text-lg text-slate-700 tv:text-tv-small">{unit}</span>
      </figcaption>

      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className="relative w-[3.2em] shrink-0 text-lg text-slate-700 tabular-nums tv:text-tv-small"
        >
          {TICKS.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${(y(tick) / HEIGHT) * 100}%` }}
            >
              {tvNumber(tick, 0)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`Tendência do NPS ${unit}, de −100 a 100. ${
              hasValues ? 'Os valores estão na tabela a seguir.' : 'Nenhum ponto com valor.'
            }`}
          >
            {TICKS.map((tick) => (
              <line
                key={tick}
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? '#475569' : '#cbd5e1'}
                strokeWidth={tick === 0 ? 3 : 2}
                strokeDasharray={tick === 0 ? '12 8' : undefined}
              />
            ))}
            {segments.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="#a50d26"
                strokeWidth={6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {points.map((point, index) =>
              point.nps === null ? null : (
                <circle
                  key={point.start}
                  cx={x(index)}
                  cy={y(point.nps)}
                  r={9}
                  fill="#a50d26"
                  stroke="#ffffff"
                  strokeWidth={3}
                />
              ),
            )}
          </svg>
          {first === undefined || last === undefined ? null : (
            <div
              aria-hidden="true"
              className="flex justify-between text-lg text-slate-700 tv:text-tv-small"
            >
              <span>{shortDate(first.start)}</span>
              <span>{shortDate(last.end)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabelas não respeitam width/height de 1 px: o recorte do sr-only fica no contêiner. */}
      <div className="sr-only">
        <table>
          <caption>Tendência do NPS {unit}</caption>
          <thead>
            <tr>
              <th scope="col">Intervalo</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.start}>
                <th scope="row">{intervalText(point)}</th>
                <td>{pointText(point)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
