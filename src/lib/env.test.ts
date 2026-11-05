import { describe, expect, it } from 'vitest';

import { parsePublicEnv } from './env';

describe('parsePublicEnv', () => {
  it('usa /api/v1 na mesma origem e development por padrão', () => {
    expect(parsePublicEnv({})).toEqual({
      apiBaseUrl: '/api/v1',
      appEnv: 'development',
    });
  });

  it('monta a base da API a partir de VITE_API_URL, sem barras finais', () => {
    expect(parsePublicEnv({ VITE_API_URL: 'http://localhost:3333/' })).toMatchObject({
      apiBaseUrl: 'http://localhost:3333/api/v1',
      appEnv: 'development',
    });
  });

  it('rejeita ambiente desconhecido', () => {
    expect(() => parsePublicEnv({ VITE_APP_ENV: 'staging' })).toThrow(/VITE_APP_ENV/);
  });

  it('rejeita URL da API sem protocolo http(s) ou já com /api/v1', () => {
    expect(() => parsePublicEnv({ VITE_API_URL: 'api.fhdod.example' })).toThrow(/VITE_API_URL/);
    expect(() => parsePublicEnv({ VITE_API_URL: '/api' })).toThrow(/VITE_API_URL/);
    expect(() => parsePublicEnv({ VITE_API_URL: 'https://api.fhdod.example/api/v1' })).toThrow(
      /não deve incluir/,
    );
  });

  it('exige https em produção quando a URL é absoluta (RNF09)', () => {
    expect(() =>
      parsePublicEnv({ VITE_APP_ENV: 'production', VITE_API_URL: 'http://api.example' }),
    ).toThrow(/https/);
    expect(
      parsePublicEnv({ VITE_APP_ENV: 'production', VITE_API_URL: 'https://api.example' })
        .apiBaseUrl,
    ).toBe('https://api.example/api/v1');
  });
});
