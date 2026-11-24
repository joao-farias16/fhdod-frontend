import type { ReactNode } from 'react';

export type TagTone = 'success' | 'info' | 'neutral';

const TONES: Record<TagTone, string> = {
  success: 'border-green-700/40 bg-green-50 text-green-800',
  info: 'border-info-700/40 bg-info-50 text-info-800',
  neutral: 'border-slate-400 bg-slate-100 text-slate-700',
};

/** Etiqueta de situação (ativo, rascunho, desativado…), sempre com texto (RNF08: nunca só cor). */
export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm leading-5 font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
