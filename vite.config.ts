import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    strictPort: true,
    // Artefatos dos testes (capturas da E2E, relatórios) não podem recarregar a página aberta.
    watch: {
      ignored: ['**/test-results/**', '**/playwright-report/**', '**/playwright/.cache/**'],
    },
    // Recurso opcional de desenvolvimento: com VITE_API_URL vazia, as chamadas a /api (mesma
    // origem) são encaminhadas para a API local. Com VITE_API_URL preenchida (padrão do
    // .env.example), o navegador chama a API diretamente e o CORS do backend libera a origem.
    // O build de produção não depende deste proxy.
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:3333',
    },
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    // Testes independentes do .env local: a API é chamada na mesma origem (/api/v1).
    env: { VITE_API_URL: '' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
