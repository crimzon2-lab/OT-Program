/**
 * 解答用紙ハイライト部品・4象限集計表・採点チェックリスト部品
 * ARCHITECTURE.md §6 準拠
 */

import {
  ANSWER_STYLE,
  TYPOGRAPHY,
  type BodyBox,
  type ChecklistItem,
  type ColumnStats,
  type QuadrantStats,
} from '../types/schema';
import { esc, fmt } from '../utils/html';

/**
 * 抹消・選択課題用の赤太丸（文字色は黒のまま外周を囲む）
 */
export function answerCircle(
  cx: number,
  cy: number,
  itemSizeMm: number,
  strokeScale = 100,
): string {
  const r = itemSizeMm * ANSWER_STYLE.markRadiusRatio + ANSWER_STYLE.markPaddingMm;
  const strokeW = (ANSWER_STYLE.markStrokeMm * strokeScale) / 100;
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="none" stroke="${ANSWER_STYLE.color}" stroke-width="${fmt(strokeW)}" />`;
}

/**
 * 単語・選択肢を囲む角丸 1mm の赤太枠
 */
export function answerRect(
  x: number,
  y: number,
  w: number,
  h: number,
  strokeScale = 100,
): string {
  const strokeW = (ANSWER_STYLE.markStrokeMm * strokeScale) / 100;
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="1" ry="1" fill="none" stroke="${ANSWER_STYLE.color}" stroke-width="${fmt(strokeW)}" />`;
}

/**
 * TMT・迷路等の正解経路（赤・破線・太線）
 * 点数が 2 点未満の場合は空文字を返す。
 */
export function answerPath(
  points: readonly { readonly x: number; readonly y: number }[],
  strokeScale = 100,
): string {
  if (points.length < 2) {
    return '';
  }

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${fmt(p.x)} ${fmt(p.y)}`)
    .join(' ');
  const strokeW = (ANSWER_STYLE.pathStrokeMm * strokeScale) / 100;

  return `<path d="${d}" fill="none" stroke="${ANSWER_STYLE.color}" stroke-width="${fmt(strokeW)}" stroke-dasharray="${ANSWER_STYLE.pathDashArray}" stroke-linecap="round" stroke-linejoin="round" />`;
}

/**
 * 本文領域の中央十字破線と四隅の象限ラベルを描く SVG 断片
 */
export function quadrantGuides(body: BodyBox): string {
  const midX = body.widthMm / 2;
  const midY = body.heightMm / 2;
  const stroke = TYPOGRAPHY.subInkColor;
  const fontSize = 2.5;

  return [
    `<g class="quadrant-guides">`,
    `  <line x1="${fmt(midX)}" y1="0" x2="${fmt(midX)}" y2="${fmt(body.heightMm)}" stroke="${stroke}" stroke-width="0.2" stroke-dasharray="2 2" />`,
    `  <line x1="0" y1="${fmt(midY)}" x2="${fmt(body.widthMm)}" y2="${fmt(midY)}" stroke="${stroke}" stroke-width="0.2" stroke-dasharray="2 2" />`,
    `  <text x="3" y="5" font-size="${fmt(fontSize)}" fill="${stroke}">左上</text>`,
    `  <text x="${fmt(body.widthMm - 3)}" y="5" font-size="${fmt(fontSize)}" text-anchor="end" fill="${stroke}">右上</text>`,
    `  <text x="3" y="${fmt(body.heightMm - 3)}" font-size="${fmt(fontSize)}" fill="${stroke}">左下</text>`,
    `  <text x="${fmt(body.widthMm - 3)}" y="${fmt(body.heightMm - 3)}" font-size="${fmt(fontSize)}" text-anchor="end" fill="${stroke}">右下</text>`,
    `</g>`,
  ].join('\n');
}

/**
 * 4象限集計結果を 2 行の文字列（正解数・検出数記入欄）としてフォーマットする
 */
export function formatQuadrantSummary(stats: QuadrantStats): string {
  const total =
    stats.topLeft.targets +
    stats.topRight.targets +
    stats.bottomLeft.targets +
    stats.bottomRight.targets;

  return [
    `正解数　左上 ${stats.topLeft.targets}　右上 ${stats.topRight.targets}　左下 ${stats.bottomLeft.targets}　右下 ${stats.bottomRight.targets}　（計 ${total}）`,
    `検出数　左上 __/${stats.topLeft.targets}　右上 __/${stats.topRight.targets}　左下 __/${stats.bottomLeft.targets}　右下 __/${stats.bottomRight.targets}　（計 __/${total}）`,
  ].join('\n');
}

/**
 * 3列集計結果を 2 行の文字列（正解数・検出数記入欄）としてフォーマットする
 */
export function formatColumnSummary(stats: ColumnStats): string {
  const total = stats.left.targets + stats.center.targets + stats.right.targets;

  return [
    `正解数　左 ${stats.left.targets}　中 ${stats.center.targets}　右 ${stats.right.targets}　（計 ${total}）`,
    `検出数　左 __/${stats.left.targets}　中 __/${stats.center.targets}　右 __/${stats.right.targets}　（計 __/${total}）`,
  ].join('\n');
}

/**
 * 採点チェックリストを表組にした HTML 断片を生成する
 */
export function checklistTableHtml(items: readonly ChecklistItem[]): string {
  if (items.length === 0) {
    return '';
  }

  const rows = items
    .map((item) => {
      const expectedText = item.expected !== undefined ? esc(item.expected) : '';
      const pointsText = item.points !== undefined ? `${fmt(item.points)}点` : '';
      return `    <tr><td class="checklist-table__check">☐</td><td class="checklist-table__label">${esc(item.label)}</td><td class="checklist-table__expected">${expectedText}</td><td class="checklist-table__points">${pointsText}</td></tr>`;
    })
    .join('\n');

  return [
    `<table class="checklist-table">`,
    `  <thead>`,
    `    <tr><th class="checklist-table__check">判定</th><th class="checklist-table__label">確認項目</th><th class="checklist-table__expected">模範解答</th><th class="checklist-table__points">配点</th></tr>`,
    `  </thead>`,
    `  <tbody>`,
    rows,
    `  </tbody>`,
    `</table>`,
  ].join('\n');
}
