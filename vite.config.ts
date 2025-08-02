import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    plugins: [react()],
          test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        css: true,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'test/',
            'dist/',
            'coverage/',
            '**/*.d.ts',
            '**/*.config.*',
            '**/*.test.*',
            '**/*.spec.*'
          ]
        }
      }
  };
});
