import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { port: 3002, host: '0.0.0.0' },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(currentDir, './src'),
      '@paic/ui': path.resolve(currentDir, '../../packages/ui'),
      '@paic/types': path.resolve(currentDir, '../../packages/types'),
      '@paic/supabase': path.resolve(currentDir, '../../packages/supabase'),
      '@paic/config': path.resolve(currentDir, '../../packages/config'),
      '@paic/analytics': path.resolve(currentDir, '../../packages/analytics'),
    }
  },
});
