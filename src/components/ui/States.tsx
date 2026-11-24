import { ChevronLeft, ChevronRight, Inbox, LoaderCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { ApiError } from '../../lib/api-client';
import { Alert } from './Alert';
import { Button } from './Button';

/** Estado de carregamento anunciado a leitores de tela (Tabela 22). */
export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 py-10 text-slate-700">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-brand-700" />
      {label}
    </p>
  );
}

/** Erro com nova tentativa e requestId (Tabela 22). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError && error.code !== 'UNEXPECTED_RESPONSE'
      ? error.message
      : 'Não foi possível carregar os dados.';
  return (
    <div className="space-y-3">
      <Alert
        tone="error"
        title="Algo deu errado"
        requestId={error instanceof ApiError ? error.requestId : undefined}
      >
        {message}
      </Alert>
      {onRetry === undefined ? null : (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw aria-hidden="true" className="size-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Estado vazio com ação (Tabela 22). */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
      >
        <Inbox className="size-6" />
      </span>
      <p className="font-semibold text-slate-900">{title}</p>
      {children === undefined ? null : (
        <div className="mt-1 max-w-md text-slate-600">{children}</div>
      )}
    </div>
  );
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Paginação com texto do intervalo exibido e botões de 44 px. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-slate-700">
        {total === 0 ? 'Nenhum registro' : `Exibindo ${first}–${last} de ${total}`}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            onPageChange(page - 1);
          }}
          disabled={page <= 1}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Button>
        <span className="px-1 text-sm font-medium whitespace-nowrap text-slate-700">
          Página {page} de {pages}
        </span>
        <Button
          variant="secondary"
          onClick={() => {
            onPageChange(page + 1);
          }}
          disabled={page >= pages}
        >
          Próxima
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
