import { ChevronDown, CircleAlert } from 'lucide-react';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  /** Marca visual de campo obrigatório (o controle recebe aria-required). */
  isRequired?: boolean | undefined;
  className?: string | undefined;
  children: (describedBy: string | undefined) => ReactNode;
}

/**
 * Rótulo, controle, dica e erro em coluna. O rótulo não quebra à toa: a largura vem da grade de
 * cada tela (campos de busca ocupam duas colunas). A marca de obrigatório fica fora do <label>, para
 * o nome acessível continuar igual ao texto do rótulo; o controle anuncia aria-required.
 */
function FieldShell({
  id,
  label,
  hint,
  error,
  isRequired,
  className = '',
  children,
}: FieldShellProps) {
  const hintId = hint === undefined ? undefined : `${id}-dica`;
  const errorId = error === undefined ? undefined : `${id}-erro`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline gap-1">
        <label htmlFor={id} className="text-sm leading-5 font-semibold text-slate-800">
          {label}
        </label>
        {isRequired === true ? (
          <span aria-hidden="true" className="text-sm leading-5 font-semibold text-danger-700">
            *
          </span>
        ) : null}
      </div>
      {children(describedBy)}
      {hint === undefined ? null : (
        <p id={hintId} className="text-sm leading-5 text-slate-600">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-sm leading-5 font-medium text-danger-700"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Aparência comum dos controles (altura de 44 px — RNF05 —, borda #6B7280 com contraste 3:1,
 * foco com borda e contorno vermelhos, erro e desabilitado). Exportada para os poucos controles
 * montados à mão (textarea com contador, por exemplo).
 */
export const CONTROL_CLASS =
  'block min-h-11 w-full min-w-0 rounded-lg border border-neutral-border bg-white px-3 text-base text-slate-900 shadow-xs transition-colors placeholder:text-slate-500 hover:border-slate-700 focus:border-brand-700 focus-visible:outline-offset-0 aria-invalid:border-danger-700 aria-invalid:focus-visible:outline-danger-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-600';

/** Área de texto: mesma aparência dos campos, com respiro vertical. */
export const TEXTAREA_CLASS = `${CONTROL_CLASS} py-2.5 leading-relaxed`;

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  isRequired?: boolean | undefined;
  /** Classes do contêiner do campo (por exemplo, ocupar duas colunas da grade). */
  fieldClassName?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

/** Campo de texto com rótulo, dica e erro associados por aria-describedby (RNF06). */
export function TextField({
  label,
  hint,
  error,
  isRequired,
  fieldClassName,
  id,
  className = '',
  ...props
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      isRequired={isRequired}
      className={fieldClassName}
    >
      {(describedBy) => (
        <input
          id={fieldId}
          aria-invalid={error === undefined ? undefined : true}
          aria-required={isRequired === true ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL_CLASS} ${className}`}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  isRequired?: boolean | undefined;
  fieldClassName?: string | undefined;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Área de texto com rótulo, dica e erro (mesmo padrão do TextField). */
export function TextAreaField({
  label,
  hint,
  error,
  isRequired,
  fieldClassName,
  id,
  className = '',
  ...props
}: TextAreaFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      isRequired={isRequired}
      className={fieldClassName}
    >
      {(describedBy) => (
        <textarea
          id={fieldId}
          aria-invalid={error === undefined ? undefined : true}
          aria-required={isRequired === true ? true : undefined}
          aria-describedby={describedBy}
          className={`${TEXTAREA_CLASS} ${className}`}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  isRequired?: boolean | undefined;
  fieldClassName?: string | undefined;
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Seleção nativa (teclado, leitores de tela e celulares continuam funcionando como sempre) com a
 * aparência do FHDOD: seta própria que gira ao abrir e, nos navegadores com seleção
 * personalizável (`appearance: base-select`), a lista de opções também segue a identidade
 * (classe `fhdod-select`, em styles/index.css). Nos demais, a lista é a do sistema.
 */
export function SelectField({
  label,
  hint,
  error,
  isRequired,
  fieldClassName,
  id,
  className = '',
  children,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      isRequired={isRequired}
      className={fieldClassName}
    >
      {(describedBy) => (
        <div className="relative">
          <select
            id={fieldId}
            aria-invalid={error === undefined ? undefined : true}
            aria-required={isRequired === true ? true : undefined}
            aria-describedby={describedBy}
            className={`fhdod-select peer ${CONTROL_CLASS} cursor-pointer appearance-none truncate pr-10 ${className}`}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-slate-600 transition-transform peer-open:rotate-180 peer-disabled:text-slate-400"
          />
        </div>
      )}
    </FieldShell>
  );
}

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /**
   * Em grades de filtros, alinha a caixa com os controles vizinhos (que têm rótulo acima) a partir
   * de duas colunas.
   */
  alignWithFields?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Caixa de seleção com área clicável de 44 px, borda e marca na cor da identidade. */
export function CheckboxField({
  label,
  alignWithFields = false,
  className = '',
  ...props
}: CheckboxFieldProps) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 transition-colors hover:border-slate-500 hover:bg-slate-50 has-checked:border-brand-700 has-checked:bg-brand-50 has-disabled:cursor-not-allowed has-disabled:opacity-60 ${alignWithFields ? 'sm:mt-[1.625rem]' : ''} ${className}`}
    >
      <input
        type="checkbox"
        className="size-5 shrink-0 cursor-pointer accent-brand-700"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
