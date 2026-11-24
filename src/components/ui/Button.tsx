import type { ButtonHTMLAttributes } from 'react';

import { buttonClasses, type ButtonVariant } from './button-classes';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Botão com alvo mínimo de 44 × 44 px (RNF05) e foco visível global (RNF07). */
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
