import { Link } from 'react-router';

import { buttonClasses } from '../components/ui/button-classes';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center space-y-4 px-4 py-16 text-center sm:px-6">
      <p aria-hidden="true" className="text-5xl font-extrabold text-brand-700">
        404
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Página não encontrada</h1>
      <p className="text-slate-600">O endereço acessado não existe. Confira o link recebido.</p>
      <Link to="/" className={buttonClasses('primary')}>
        Voltar ao início
      </Link>
    </div>
  );
}
