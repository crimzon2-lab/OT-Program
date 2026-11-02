/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * オフライン完全保証用 CSP 注入プラグイン
 * ARCHITECTURE.md §12 準拠
 * mode === 'single' のビルド時のみ <head> 先頭に CSP メタタグを注入する。
 * 通常 dev 時は HMR 用 WebSocket を妨げないよう注入しない。
 */
function cspInjectPlugin(): Plugin {
  return {
    name: 'csp-inject-plugin',
    apply: 'build',
    transformIndexHtml(html) {
      const cspMeta =
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'" />';
      // <head> タグの直後に挿入、なければ先頭に挿入
      if (html.includes('<head>')) {
        return html.replace('<head>', `<head>\n    ${cspMeta}`);
      }
      return `${cspMeta}\n${html}`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const isSingle = mode === 'single';

  return {
    base: './',
    plugins: isSingle ? [viteSingleFile(), cspInjectPlugin()] : [],
    build: {
      outDir: 'dist',
      target: 'es2020',
      emptyOutDir: true,
      copyPublicDir: false,
      ...(isSingle
        ? {
            assetsInlineLimit: 100_000_000,
            cssCodeSplit: false,
          }
        : {}),
    },
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
