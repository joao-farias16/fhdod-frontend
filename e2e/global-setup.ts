import { runFixture } from './support';

/**
 * Cria os dados E2E (banco MySQL de teste local, pelo script da API) antes da execução; a função devolvida
 * é o teardown do Playwright, que exclui as contas fictícias ao final.
 */
export default function globalSetup(): () => void {
  runFixture('setup');
  return () => {
    runFixture('teardown');
  };
}
