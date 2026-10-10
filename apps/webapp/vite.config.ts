/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(currentDir, '.'),
          '@paic/ui': path.resolve(currentDir, '../../packages/ui'),
          '@paic/types': path.resolve(currentDir, '../../packages/types'),
          '@paic/supabase': path.resolve(currentDir, '../../packages/supabase'),
          '@paic/config': path.resolve(currentDir, '../../packages/config'),
          '@paic/analytics': path.resolve(currentDir, '../../packages/analytics'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
      }
    };
});
