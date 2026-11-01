/**
 * A4 シート HTML 組版レンダラー
 * ARCHITECTURE.md §3.1, §3.6 準拠
 */

import {
  CALIBRATION_BAR_MM,
  TYPOGRAPHY,
  type Orientation,
  type RenderedPage,
} from '../types/schema';
import { esc, fmt } from '../utils/html';
import { renderHeaderHtml } from './header';

/**
 * 教示文帯の HTML を生成する。
 * 改行 \r\n は \n に正規化し、各行に esc() を適用後 <br /> で結合する。
 * 文字数と明示改行数からフォントサイズ（4.2mm * scale -> 3.2mm）を純粋計算する（DOM計測禁止）。
 */
export function renderInstructionHtml(
  instruction: string | undefined,
  orientation: Orientation,
  textScale = 100,
): string {
  if (!instruction || instruction.trim().length === 0) {
    return `<div class="sheet__instruction"></div>`;
  }

  const normalized = instruction.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const escapedHtml = lines.map(esc).join('<br />');

  const baseSize = 4.2 * (textScale / 100);
  const bandWidth = orientation === 'portrait' ? 186 : 273;
  const charsPerLine = Math.max(1, Math.floor(bandWidth / baseSize));

  let totalLines = 0;
  for (const line of lines) {
    const len = Array.from(line).length;
    totalLines += Math.max(1, Math.ceil(len / charsPerLine));
  }

  // 2行に収まらない場合は 3.2mm まで縮小
  const fontSize = totalLines > 2 ? 3.2 : baseSize;

  return `<div class="sheet__instruction" style="font-size: ${fmt(fontSize)}mm;">${escapedHtml}</div>`;
}

/**
 * フッター帯の HTML を生成する。
 * 左に実寸 50mm の校正バー、右にページ番号を描画する。
 */
export function renderFooterHtml(page: RenderedPage): string {
  const barWidth = CALIBRATION_BAR_MM;
  const calibrationSvg = [
    `<svg width="${barWidth}mm" height="5mm" viewBox="0 0 ${barWidth} 5" class="sheet__calibration-bar">`,
    `  <line x1="0" y1="0.5" x2="${barWidth}" y2="0.5" stroke="#000000" stroke-width="0.3" />`,
    `  <line x1="0" y1="0.5" x2="0" y2="2.5" stroke="#000000" stroke-width="0.3" />`,
    `  <line x1="${barWidth}" y1="0.5" x2="${barWidth}" y2="2.5" stroke="#000000" stroke-width="0.3" />`,
    `  <text x="${barWidth / 2}" y="4.2" font-size="2" text-anchor="middle" font-family="${esc(TYPOGRAPHY.fontFamily)}">50mm（印刷倍率確認用）</text>`,
    `</svg>`,
  ].join('\n');

  let pageText = `${page.pageNo} / ${page.pageTotal}`;
  if (page.sheetCount > 1) {
    pageText += `　（${page.sheetIndex} / ${page.sheetCount} 枚目）`;
  }

  return [
    `<footer class="sheet__footer">`,
    `  <div class="sheet__footer-left">${calibrationSvg}</div>`,
    `  <div class="sheet__footer-right">${esc(pageText)}</div>`,
    `</footer>`,
  ].join('\n');
}

/**
 * 1 ページ分の A4 シート HTML を組み立てる。
 * page.body.markup は二重エスケープせずそのまま挿入する。
 */
export function renderSheetHtml(
  page: RenderedPage,
  textScale = 100,
): string {
  const headerHtml = renderHeaderHtml(page);
  const instructionHtml = renderInstructionHtml(
    page.body.instruction,
    page.orientation,
    textScale,
  );
  const footerHtml = renderFooterHtml(page);

  return [
    `<div class="sheet-frame sheet-frame--${page.orientation}">`,
    `  <section class="sheet sheet--${page.orientation}" data-role="${page.body.pageRole}" data-sheet="${page.sheetIndex}">`,
    `    ${headerHtml}`,
    `    ${instructionHtml}`,
    `    <div class="sheet__body">`,
    `      ${page.body.markup}`,
    `    </div>`,
    `    ${footerHtml}`,
    `  </section>`,
    `</div>`,
  ].join('\n');
}
