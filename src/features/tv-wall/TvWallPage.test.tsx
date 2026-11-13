/**
 * TL15 — TV Wall (ET10), testes de componente com a API simulada no fetch:
 * T29 — somente o E42, sem token, sem links nem dados pessoais; campos fora da lista ignorados.
 * T30 — estados sem respostas, total suprimido (1 a 4) e setores/pontos suprimidos.
 * T31 — atualização a cada 60 s, falha com os últimos dados e aviso, recuperação, recarga de 6 h,
 *       pausa com a aba oculta.
 * A parte ponta a ponta (API real, medição no DOM em 1920 × 1080) está em e2e/tv-wall.spec.ts.
 */
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../app/query-client';
import { apiError, FakeAuthClient, json, mockApi, renderApp } from '../../test/helpers';
import type { TvWallSummary } from './tv-wall-api';
import { TvWallPage } from './TvWallPage';

function summary(overrides: Partial<TvWallSummary> = {}): TvWallSummary {
  return {
    period: { key: '30d', from: '2026-10-14', to: '2026-11-12' },
    generatedAt: '2026-11-12T22:33:40.060Z',
    suppressionThreshold: 5,
    overall: {
      n: 568,
      nps: 44.7,
      promotersPercent: 59.7,
      detractorsPercent: 15,
      suppressed: false,
    },
    trend: {
      granularity: 'day',
      points: [
        { start: '2026-11-10', end: '2026-11-10', n: 26, nps: 26.9, suppressed: false },
        { start: '2026-11-11', end: '2026-11-11', n: null, nps: null, suppressed: true },
        { start: '2026-11-12', end: '2026-11-12', n: 0, nps: null, suppressed: false },
      ],
    },
    sectors: [
      { name: 'Maternidade', n: 82, nps: 70.7, promotersPercent: 75.6, detractorsPercent: 4.9 },
      {
        name: 'Pronto Atendimento',
        n: 128,
        nps: -4.7,
        promotersPercent: 40.6,
        detractorsPercent: 45.3,
      },
    ],
    ...overrides,
  };
}

const SUMMARY = 'GET /tv-wall/summary';

/** Renderiza só a TV Wall, com a função de recarga injetada. */
function renderTv(path = '/tv', reload = vi.fn()) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter([{ path: 'tv', element: <TvWallPage reload={reload} /> }], {
    initialEntries: [path],
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, reload, queryClient };
}

/** Avança o relógio falso e deixa as promessas pendentes terminarem. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const npsValue = () => document.querySelector('[data-tv-value="nps"]')?.textContent;

beforeEach(() => {
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.setSystemTime(new Date('2026-11-12T22:34:00.000Z'));
});

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});

describe('TL15 — conteúdo e isolamento (T29, RF68, RF72)', () => {
  it('pela rota /tv da aplicação: exibe os agregados do E42, sem menu, links ou sessão', async () => {
    const { calls } = mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    const { container } = renderApp('/tv', new FakeAuthClient());

    expect(await screen.findByText('44,7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'NPS geral do hospital' })).toBeInTheDocument();
    expect(document.querySelector('[data-tv-value="n"]')).toHaveTextContent('568');
    expect(screen.getByText('respostas consideradas')).toBeInTheDocument();
    expect(document.querySelector('[data-tv-value="promoters"]')).toHaveTextContent('59,7%');
    expect(document.querySelector('[data-tv-value="detractors"]')).toHaveTextContent('15%');
    expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
    expect(screen.getByText(/14\/10\/2026 a 12\/11\/2026 · atualizado às 19:33/)).toBeVisible();

    // Setores na ordem do E42, com n e NPS (sinal de menos tipográfico).
    const rows = within(screen.getByRole('table', { name: /por setor/ })).getAllByRole('row');
    expect(rows.slice(1).map((row) => row.textContent)).toEqual([
      'Maternidade82 respostas70,7',
      'Pronto Atendimento128 respostas−4,7',
    ]);

    // Convite institucional (TL15).
    expect(screen.getByText('Sua opinião melhora o nosso atendimento.')).toBeInTheDocument();

    // RF72: nenhum link, menu, botão ou formulário; nada da área administrativa.
    expect(container.querySelectorAll('a, nav, button, form, input')).toHaveLength(0);
    expect(screen.queryByText(/Sair|Entrar|Painel|Ouvidoria|Usuários/)).not.toBeInTheDocument();

    // Somente o E42, sem token, com o período padrão.
    expect(calls.map((call) => `${call.method} ${call.path}?${call.query.toString()}`)).toEqual([
      'GET /tv-wall/summary?period=30d',
    ]);
    expect(calls[0]?.authorization).toBeNull();
    expect(document.title).toBe('TV Wall — FHDOD');
  });

  it('campos fora da lista permitida não chegam à tela', async () => {
    const data = summary();
    const leaked = {
      ...data,
      protocol: 'FHD-2026-000184',
      sectors: [{ ...data.sectors[0], email: 'contato@example.com', team: 'Equipe A' }],
    };
    mockApi({ [SUMMARY]: () => json({ data: leaked }) });
    renderTv();

    expect(await screen.findByText('Maternidade')).toBeInTheDocument();
    const text = document.body.textContent;
    expect(text).not.toContain('FHD-2026');
    expect(text).not.toContain('@example.com');
    expect(text).not.toContain('Equipe A');
  });

  it('período pela URL: ?periodo=7d; valor inválido usa 30d', async () => {
    const { calls } = mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    const first = renderTv('/tv?periodo=7d');
    await screen.findByText('44,7');
    first.unmount();
    renderTv('/tv?periodo=1y');
    await screen.findByText('44,7');
    expect(calls.map((call) => call.query.get('period'))).toEqual(['7d', '30d']);
  });

  it('carregamento inicial anunciado', async () => {
    let resolve: (response: Response) => void = () => undefined;
    mockApi({
      [SUMMARY]: () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    });
    renderTv();
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando os indicadores…');
    resolve(json({ data: summary() }));
    expect(await screen.findByText('44,7')).toBeInTheDocument();
  });
});

describe('TL15 — estados sem dados e supressão (T30, RF60, RF71)', () => {
  it('sem respostas: não exibe NPS 0, mostra n = 0 e percentuais vazios', async () => {
    mockApi({
      [SUMMARY]: () =>
        json({
          data: summary({
            overall: {
              n: 0,
              nps: null,
              promotersPercent: null,
              detractorsPercent: null,
              suppressed: false,
            },
            sectors: [],
          }),
        }),
    });
    renderTv();

    expect(await screen.findByText('Sem respostas no período')).toBeInTheDocument();
    expect(npsValue()).toBe('Sem respostas no período');
    expect(document.querySelector('[data-tv-value="n"]')).toHaveTextContent('0');
    expect(document.querySelector('[data-tv-value="promoters"]')).toHaveTextContent('—');
    expect(document.querySelector('[data-tv-value="detractors"]')).toHaveTextContent('—');
    const percentages = [...document.querySelectorAll('dd')];
    expect(percentages.map((dd) => dd.textContent)).toEqual(['—sem respostas', '—sem respostas']);
    expect(screen.getByText('Nenhuma resposta no período.')).toBeInTheDocument();
  });

  it('total suprimido (1 a 4 respostas): nenhum valor, só o aviso de menos de 5 respostas', async () => {
    mockApi({
      [SUMMARY]: () =>
        json({
          data: summary({
            overall: {
              n: null,
              nps: null,
              promotersPercent: null,
              detractorsPercent: null,
              suppressed: true,
            },
            sectors: [],
          }),
        }),
    });
    renderTv();

    expect(await screen.findByText('Menos de 5 respostas')).toBeInTheDocument();
    expect(document.querySelector('[data-tv-value="n"]')).toBeNull();
    expect(document.querySelector('[data-tv-value="promoters"]')).toHaveTextContent('—');
    expect(screen.getAllByText('menos de 5 respostas')).toHaveLength(2);
    expect(screen.getByText('Nenhum setor com 5 respostas ou mais no período.')).toBeVisible();
    // Nenhum número de respostas é inferido (nem o total, nem por setor).
    expect(screen.queryByText(/^\d[\d.]* respostas?$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /por setor/ })).not.toBeInTheDocument();
  });

  it('dados parciais: setores suprimidos não aparecem; pontos suprimidos ficam vazios', async () => {
    mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    renderTv();

    await screen.findByText('Maternidade');
    expect(screen.getByText(/Setores com menos de 5 respostas não aparecem/)).toBeVisible();
    // Só os setores do E42 (sem completar com os ausentes).
    const table = screen.getByRole('table', { name: /por setor/ });
    expect(within(table).getAllByRole('row')).toHaveLength(3);

    // Tendência: um marcador só para o ponto com valor; os outros, descritos na tabela.
    expect(document.querySelectorAll('svg circle')).toHaveLength(1);
    const trend = screen.getByRole('table', { name: /Tendência do NPS/ });
    expect(within(trend).getByText('NPS 26,9 (26 respostas)')).toBeInTheDocument();
    expect(within(trend).getByText('oculto (menos de 5 respostas)')).toBeInTheDocument();
    expect(within(trend).getByText('sem respostas')).toBeInTheDocument();
  });
});

describe('TL15 — atualização automática (T31, RF69)', () => {
  it('consulta a cada 60 s e atualiza os indicadores sem recarregar a página', async () => {
    let overall = summary().overall;
    const { calls } = mockApi({ [SUMMARY]: () => json({ data: summary({ overall }) }) });
    const { reload } = renderTv();
    await screen.findByText('44,7');
    expect(calls).toHaveLength(1);

    // Nova resposta registrada na API.
    overall = { ...overall, n: 569, nps: 50.2 };
    await advance(59_000);
    expect(calls).toHaveLength(1);
    await advance(1_000);
    expect(await screen.findByText('50,2')).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    expect(document.querySelector('[data-tv-value="n"]')).toHaveTextContent('569');

    await advance(60_000);
    expect(calls).toHaveLength(3);
    expect(reload).not.toHaveBeenCalled();
  });

  it('API indisponível: mantém os últimos dados com aviso; recupera quando a API volta', async () => {
    let state: 'ok' | 'down' | 'back' = 'ok';
    const { calls } = mockApi({
      [SUMMARY]: () => {
        if (state === 'down') return apiError(503, 'SERVICE_UNAVAILABLE', 'Indisponível.');
        if (state === 'back')
          return json({ data: summary({ overall: { ...summary().overall, nps: 48 } }) });
        return json({ data: summary() });
      },
    });
    renderTv();
    await screen.findByText('44,7');

    state = 'down';
    await advance(60_000);
    await advance(2_000); // uma nova tentativa rápida antes do aviso
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sem conexão com o servidor.');
    expect(alert).toHaveTextContent('Exibindo os últimos dados recebidos, das 19:33.');
    expect(npsValue()).toBe('44,7');
    expect(screen.getByText('Maternidade')).toBeInTheDocument();
    expect(calls).toHaveLength(3);

    state = 'back';
    await advance(60_000);
    expect(await screen.findByText('48')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha de rede e resposta fora do contrato também mantêm os últimos dados', async () => {
    let mode: 'ok' | 'network' | 'invalid' = 'ok';
    mockApi({
      [SUMMARY]: () => {
        if (mode === 'network') throw new TypeError('Failed to fetch');
        if (mode === 'invalid') return json({ data: { overall: { nps: 0 } } });
        return json({ data: summary() });
      },
    });
    renderTv();
    await screen.findByText('44,7');

    mode = 'network';
    await advance(62_000);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor.');
    expect(npsValue()).toBe('44,7');

    mode = 'invalid';
    await advance(62_000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(npsValue()).toBe('44,7');
  });

  it('sem dados ainda e API fora: mensagem de erro e nova tentativa automática', async () => {
    let up = false;
    mockApi({
      [SUMMARY]: () =>
        up ? json({ data: summary() }) : apiError(503, 'SERVICE_UNAVAILABLE', 'Indisponível.'),
    });
    renderTv();
    await advance(2_000);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os indicadores.',
    );
    up = true;
    await advance(60_000);
    expect(await screen.findByText('44,7')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('429: não insiste antes do próximo ciclo', async () => {
    let limited = false;
    const { calls } = mockApi({
      [SUMMARY]: () =>
        limited ? apiError(429, 'RATE_LIMITED', 'Muitas requisições.') : json({ data: summary() }),
    });
    renderTv();
    await screen.findByText('44,7');
    limited = true;
    await advance(65_000);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(calls).toHaveLength(2);
  });

  it('recarrega a página após 6 h com a API respondendo', async () => {
    mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    const { reload } = renderTv();
    await screen.findByText('44,7');
    // Margem de 1 min: o relógio falso também avança com o tempo real do teste.
    await advance(6 * 60 * 60 * 1000 - 60_000);
    expect(reload).not.toHaveBeenCalled();
    await advance(60_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('com a API fora após 6 h, adia a recarga para não perder os últimos dados', async () => {
    let up = true;
    mockApi({
      [SUMMARY]: () =>
        up ? json({ data: summary() }) : apiError(503, 'SERVICE_UNAVAILABLE', 'Indisponível.'),
    });
    const { reload } = renderTv();
    await screen.findByText('44,7');
    await advance(6 * 60 * 60 * 1000 - 70_000);
    up = false;
    await advance(70_000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();

    up = true;
    await advance(60_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('aba oculta: pausa a consulta, avisa dados desatualizados e atualiza ao voltar', async () => {
    const { calls } = mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    renderTv();
    await screen.findByText('44,7');

    act(() => {
      focusManager.setFocused(false);
    });
    await advance(180_000);
    expect(calls).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Dados desatualizados.');

    act(() => {
      focusManager.setFocused(true);
    });
    await advance(100);
    expect(calls).toHaveLength(2);
    await advance(15_000);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ao desmontar, encerra os temporizadores (sem consultas depois)', async () => {
    const { calls } = mockApi({ [SUMMARY]: () => json({ data: summary() }) });
    const { unmount, reload } = renderTv();
    await screen.findByText('44,7');
    unmount();
    await advance(7 * 60 * 60 * 1000);
    expect(calls).toHaveLength(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
