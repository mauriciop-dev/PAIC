import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { port: 3003, host: '0.0.0.0' },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@paic/ui': path.resolve(__dirname, '../../packages/ui'),
      '@paic/types': path.resolve(__dirname, '../../packages/types'),
      '@paic/config': path.resolve(__dirname, '../../packages/config'),
      '@paic/analytics': path.resolve(__dirname, '../../packages/analytics'),
    }
  },
});