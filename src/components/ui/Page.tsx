import { type ComponentProps, type ReactNode, useId } from 'react';

/**
 * Estrutura comum das telas administrativas: largura, margens e espaçamento entre blocos iguais em
 * todas as páginas. `narrow` serve a formulários de uma coluna (troca de senha, por exemplo).
 */
export function PageContainer({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={`mx-auto space-y-6 px-4 py-6 sm:px-6 sm:py-8 ${narrow ? 'max-w-2xl' : 'max-w-7xl'}`}
    >
      {children}
    </div>
  );
}

/** Título da página, descrição curta e ações principais à direita (abaixo, no celular). */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Linhas extras abaixo da descrição (escopo, período…). */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900 sm:text-[1.75rem] sm:leading-9">
          {title}
        </h1>
        {description === undefined ? null : (
          <p className="max-w-3xl text-pretty text-slate-600">{description}</p>
        )}
        {children}
      </div>
      {actions === undefined ? null : (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </div>
  );
}

/** Cartão branco com borda e sombra leves, usado em todos os blocos de conteúdo. */
export const CARD_CLASS = 'rounded-xl border border-slate-200 bg-white shadow-sm';

/** Cartão com título opcional, ações à direita e conteúdo. */
export function Card({
  title,
  titleId,
  description,
  actions,
  children,
  className = '',
  as: Tag = 'section',
}: {
  title?: ReactNode;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
}) {
  const generated = useId();
  const headingId = titleId ?? generated;
  return (
    <Tag
      aria-labelledby={Tag === 'section' && title !== undefined ? headingId : undefined}
      className={`${CARD_CLASS} space-y-4 p-5 sm:p-6 ${className}`}
    >
      {title === undefined && actions === undefined ? null : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          {title === undefined ? null : (
            <div className="space-y-1">
              <h2 id={headingId} className="text-lg leading-7 font-semibold text-slate-900">
                {title}
              </h2>
              {description === undefined ? null : (
                <p className="text-sm text-slate-600">{description}</p>
              )}
            </div>
          )}
          {actions === undefined ? null : (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children}
    </Tag>
  );
}

/**
 * Formulário de filtros padronizado: campos em grade (largura e altura iguais, rótulos sem quebra
 * indevida) e uma barra de ações separada por uma linha, com a ação principal à direita. No
 * celular, os botões ocupam a largura toda e a ação principal fica em cima.
 *
 * `columns` define a grade a partir de telas largas; campos de busca ou com rótulo longo podem
 * ocupar duas colunas (`fieldClassName="sm:col-span-2"`).
 */
export function FilterPanel({
  label,
  onSubmit,
  children,
  actions,
  options,
  columns = 4,
}: {
  label: string;
  onSubmit: ComponentProps<'form'>['onSubmit'];
  children: ReactNode;
  /** Botões da barra inferior, na ordem de leitura (o último é a ação principal). */
  actions?: ReactNode;
  /** Opções à esquerda da barra (por exemplo, "Comparar com o período anterior"). */
  options?: ReactNode;
  columns?: 3 | 4 | 5;
}) {
  const grid = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  }[columns];
  return (
    <form
      role="search"
      aria-label={label}
      noValidate
      onSubmit={onSubmit}
      className={`${CARD_CLASS} p-4 sm:p-5`}
    >
      <div className={`grid items-start gap-x-4 gap-y-4 sm:grid-cols-2 ${grid}`}>{children}</div>
      {actions === undefined && options === undefined ? null : (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">{options}</div>
          {actions === undefined ? null : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
              {actions}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
