import type { ReactNode } from 'react';

import { CARD_CLASS } from './Page';

/**
 * Tabelas de listagem: mesmo espaçamento, cabeçalho e linhas em todas as telas. Em telas
 * estreitas a tabela rola dentro do próprio cartão (região focável, com nome), nunca a página.
 */
export function TableContainer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${CARD_CLASS} overflow-x-auto`} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

export const TABLE_CLASS = 'w-full border-collapse text-left text-sm';
export const THEAD_CLASS = 'border-b border-slate-200 bg-slate-50 text-slate-700';
/** Cabeçalho de coluna: curto, sem quebra. */
export const TH_CLASS = 'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap uppercase';
export const TBODY_CLASS = 'divide-y divide-slate-200';
export const TR_CLASS = 'align-top transition-colors hover:bg-slate-50';
export const TD_CLASS = 'px-4 py-3.5';
/** Coluna de ações: alinhada à direita e sem ser espremida. */
export const TD_ACTIONS_CLASS = 'px-3 py-2 text-right whitespace-nowrap';

/**
 * Em telas abaixo de 768 px, a tabela vira uma lista de cartões: cada linha é um bloco e cada
 * célula mostra o nome da coluna (atributo `data-label`) ao lado do valor, sem rolagem lateral.
 * A primeira célula sem `data-label` funciona como título; a de ações (`data-actions`) vai ao pé.
 * O cabeçalho continua no DOM (só fica visualmente oculto), para os leitores de tela.
 */
export const STACK_TABLE_CLASS = 'table-stack';
