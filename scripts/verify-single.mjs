/**
 * scripts/verify-single.mjs
 * 単一 HTML 出力（dist/index.html）の自動検証スクリプト
 * ARCHITECTURE.md §12 準拠
 * TASKS.md Task 78
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const indexHtmlPath = path.resolve(distDir, 'index.html');

console.log('🔍 [verify-single] 単一 HTML 出力（dist/index.html）の検査を開始します...');

const errors = [];

// 1. dist/ ディレクトリ内のファイル検証
if (!fs.existsSync(distDir)) {
  errors.push(`dist ディレクトリが存在しません: ${distDir}`);
} else {
  function getAllFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(fullPath));
      } else {
        files.push(path.relative(distDir, fullPath));
      }
    }
    return files;
  }

  const allFiles = getAllFiles(distDir);
  if (allFiles.length !== 1 || allFiles[0] !== 'index.html') {
    errors.push(
      `dist/ 配下のファイルは index.html のみである必要がありますが、以下のファイルが存在します:\n  - ${allFiles.join(
        '\n  - ',
      )}`,
    );
  }
}

// 2. dist/index.html の存在とファイルサイズ検証 (50KB以上 3MB未満)
if (!fs.existsSync(indexHtmlPath)) {
  errors.push(`dist/index.html が存在しません: ${indexHtmlPath}`);
} else {
  const stat = fs.statSync(indexHtmlPath);
  const sizeKb = stat.size / 1024;
  const minKb = 50;
  const maxKb = 3 * 1024; // 3072KB (3MB)

  console.log(`ℹ️ [verify-single] ファイルサイズ: ${sizeKb.toFixed(2)} KB (${stat.size} bytes)`);

  if (sizeKb < minKb) {
    errors.push(`dist/index.html のサイズが小さすぎます (${sizeKb.toFixed(2)} KB < ${minKb} KB)`);
  }
  if (sizeKb >= maxKb) {
    errors.push(`dist/index.html のサイズが大きすぎます (${sizeKb.toFixed(2)} KB >= ${maxKb} KB)`);
  }

  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

  // 3. 外部参照（<script src=, <link rel="stylesheet"）の不在検証
  const scriptSrcMatch = htmlContent.match(/<script\b[^>]*\bsrc\s*=\s*['"][^'"]+['"][^>]*>/gi);
  if (scriptSrcMatch) {
    errors.push(
      `外部スクリプト参照 (<script src=...) が検出されました:\n  ${scriptSrcMatch.join('\n  ')}`,
    );
  }

  const linkStylesheetMatch = htmlContent.match(
    /<link\b[^>]*\brel\s*=\s*['"]stylesheet['"][^>]*>/gi,
  );
  if (linkStylesheetMatch) {
    errors.push(
      `外部スタイルシート参照 (<link rel="stylesheet"...) が検出されました:\n  ${linkStylesheetMatch.join(
        '\n  ',
      )}`,
    );
  }

  // 4. Content-Security-Policy メタタグと connect-src 'none' の存在検証
  const cspMetaMatch = htmlContent.match(
    /<meta\b[^>]*http-equiv\s*=\s*['"]Content-Security-Policy['"][^>]*>/i,
  );
  if (!cspMetaMatch) {
    errors.push('Content-Security-Policy の <meta> タグが存在しません');
  } else {
    const cspTag = cspMetaMatch[0];
    if (!cspTag.includes("connect-src 'none'")) {
      errors.push(
        `CSP に connect-src 'none' が含まれていません。現在のタグ:\n  ${cspTag}`,
      );
    }
    if (!cspTag.includes("script-src 'unsafe-inline'")) {
      errors.push('CSP に script-src \'unsafe-inline\' が含まれていません');
    }
  }

  // 5. 外部 URL の不在検証 (SVG/XHTML 名前空間 http://www.w3.org/2000/svg, http://www.w3.org/1999/xhtml を除く)
  const ALLOWED_URLS = new Set([
    'http://www.w3.org/2000/svg',
    'http://www.w3.org/1999/xhtml',
  ]);

  const allUrls = htmlContent.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const invalidUrls = [];
  for (const rawUrl of allUrls) {
    // 末尾のスラッシュや余分な文字を正規化
    const url = rawUrl.replace(/[;,\)]+$/, '');
    if (!ALLOWED_URLS.has(url)) {
      invalidUrls.push(url);
    }
  }

  if (invalidUrls.length > 0) {
    errors.push(
      `許可されていない外部 URL が検出されました (${invalidUrls.length} 件):\n  - ${invalidUrls
        .slice(0, 10)
        .join('\n  - ')}${invalidUrls.length > 10 ? '\n  ...他' : ''}`,
    );
  }
}

// 判定
if (errors.length > 0) {
  console.error('\n❌ [verify-single] 単一 HTML 検証に失敗しました:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('✅ [verify-single] すべての検査項目をクリアしました！');
console.log('  - dist/ 配下のファイルは index.html 1つのみ');
console.log('  - ファイルサイズ規定範囲内 (50KB〜3MB)');
console.log('  - 外部スクリプト・スタイルシート参照ゼロ');
console.log('  - 通信遮断 CSP (connect-src \'none\') 注入確認');
console.log('  - 外部 URL 参照ゼロ (SVG名前空間除く)');
console.log('完全オフライン単一 HTML の整合性が確認されました。\n');
process.exit(0);
