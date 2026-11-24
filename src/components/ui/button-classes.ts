export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  // Tabela 22 (identidade FHDOD): primário vermelho #C8102E com texto branco (5,88:1); secundário
  // com borda #6B7280;
  // perigo vermelho-escuro #991B1B (8,31:1), sempre com confirmação.
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-800 disabled:bg-brand-700/60 disabled:shadow-none',
  secondary:
    'border border-neutral-border bg-white text-slate-900 shadow-xs hover:border-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:border-slate-300 disabled:bg-white disabled:text-slate-500',
  danger:
    'bg-danger-700 text-white shadow-sm hover:bg-danger-800 active:bg-danger-800 disabled:bg-danger-700/60 disabled:shadow-none',
  ghost:
    'text-brand-700 hover:bg-brand-50 hover:text-brand-800 active:bg-brand-100 disabled:bg-transparent disabled:text-slate-500',
};

/**
 * Classes do botão, para reaproveitar em links com aparência de botão (navegação, download).
 * Altura mínima de 44 px (RNF05), ícones de 16–20 px com 8 px de espaço e texto centralizado.
 */
export function buttonClasses(variant: ButtonVariant = 'primary', className = ''): string {
  return `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-center leading-tight font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`;
}
