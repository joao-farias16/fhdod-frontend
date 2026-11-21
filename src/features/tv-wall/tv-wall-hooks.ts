import { useEffect, useState } from 'react';

/** Instante atual (ms), atualizado a cada `intervalMs`, para avisos que dependem do tempo. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

/**
 * RF69 — recarga completa da página depois de `intervalMs` (6 h na TV Wall), para aplicar uma nova
 * publicação do frontend e liberar memória. Enquanto `canReload` for falso (API fora do ar com
 * dados na tela), a recarga é adiada: recarregar nesse momento apagaria os últimos dados válidos.
 * Ela acontece assim que a API voltar a responder.
 */
export function usePeriodicReload(intervalMs: number, canReload: boolean, reload: () => void) {
  const [due, setDue] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setDue(true);
    }, intervalMs);
    return () => {
      clearTimeout(id);
    };
  }, [intervalMs]);

  useEffect(() => {
    if (due && canReload) reload();
  }, [due, canReload, reload]);
}

/** Título da aba do navegador enquanto a página estiver aberta. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
