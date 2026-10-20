import { defineConfig } from 'vitest/config';
import baseConfig from './vite.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/tests/e2e/**', // Excluir pruebas E2E de Playwright (se ejecutan con playwright, no vitest)
    ],
  },
});
