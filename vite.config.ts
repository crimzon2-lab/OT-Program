/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// 単一HTML（file:// 起動用）ビルドの構成は TASKS.md の Task 75 で追加する。
// それまでは通常ビルドのみ。
export default defineConfig(() => ({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}));
