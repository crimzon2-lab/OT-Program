/**
 * M05 線分抹消・線分二等分 SVG 描画
 * ARCHITECTURE.md §5.2, §6, §8, §9 準拠
 */

import {
  answerCircle,
  formatColumnSummary,
  formatQuadrantSummary,
} from '../../../print/answerParts';
import {
  ANSWER_STYLE,
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M05Params,
  type PageBody,
} from '../../../types/schema';
import { fmt } from '../../../utils/html';
import type { M05Data } from './logic';

const CIRCLED_NUMBERS = [
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
];

/**
 * M05 SVG レンダリング
 */
export function renderM05(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
  data: M05Data,
): GenerateResult {
  if (data.subMode === 'cancellation') {
    return renderCancellation(ctx, params, data);
  }
  return renderBisection(ctx, params, data);
}

/**
 * サブモードA：線分抹消描画
 */
function renderCancellation(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
  data: Extract<M05Data, { subMode: 'cancellation' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const strokeScale = params.strokeScale ?? 100;
  const strokeW = (0.5 * strokeScale) / 100;

  // 線分の描画
  const linesMarkup = data.lines
    .map((l) => {
      return `<line x1="${fmt(l.x1)}" y1="${fmt(l.y1)}" x2="${fmt(l.x2)}" y2="${fmt(l.y2)}" stroke="#000000" stroke-width="${fmt(strokeW)}" stroke-linecap="round" />`;
    })
    .join('\n    ');

  // 練習枠の描画（存在する場合）
  let practiceBoxSvg = '';
  if (data.practiceBox) {
    const pb = data.practiceBox;
    practiceBoxSvg = [
      `<g class="practice-box">`,
      `  <rect x="${fmt(pb.x)}" y="${fmt(pb.y)}" width="${fmt(pb.w)}" height="${fmt(pb.h)}" fill="none" stroke="#888888" stroke-width="0.3" stroke-dasharray="2 2" rx="1" />`,
      `  <text x="${fmt(pb.x + 3)}" y="${fmt(pb.y + 4.5)}" font-size="3" fill="#666666" font-family="${TYPOGRAPHY.fontFamily}">練習</text>`,
      `</g>`,
    ].join('\n    ');
  }

  // 解答用紙の区画ガイド線（横3列・縦2段境界）
  const colW = bodyW / 3;
  const rowH = bodyH / 2;
  const guideStroke = '#aaaaaa';
  const guideSvg = [
    `<g class="section-guides">`,
    `  <line x1="${fmt(colW)}" y1="0" x2="${fmt(colW)}" y2="${fmt(bodyH)}" stroke="${guideStroke}" stroke-width="0.25" stroke-dasharray="3 3" />`,
    `  <line x1="${fmt(colW * 2)}" y1="0" x2="${fmt(colW * 2)}" y2="${fmt(bodyH)}" stroke="${guideStroke}" stroke-width="0.25" stroke-dasharray="3 3" />`,
    `  <line x1="0" y1="${fmt(rowH)}" x2="${fmt(bodyW)}" y2="${fmt(rowH)}" stroke="${guideStroke}" stroke-width="0.25" stroke-dasharray="3 3" />`,
    `  <text x="3" y="5" font-size="2.6" fill="${guideStroke}">左上</text>`,
    `  <text x="${fmt(colW + 3)}" y="5" font-size="2.6" fill="${guideStroke}">中上</text>`,
    `  <text x="${fmt(colW * 2 + 3)}" y="5" font-size="2.6" fill="${guideStroke}">右上</text>`,
    `  <text x="3" y="${fmt(rowH + 5)}" font-size="2.6" fill="${guideStroke}">左下</text>`,
    `  <text x="${fmt(colW + 3)}" y="${fmt(rowH + 5)}" font-size="2.6" fill="${guideStroke}">中下</text>`,
    `  <text x="${fmt(colW * 2 + 3)}" y="${fmt(rowH + 5)}" font-size="2.6" fill="${guideStroke}">右下</text>`,
    `</g>`,
  ].join('\n    ');

  // 解答用ハイライト（本課題線分の中点を赤丸で囲む。練習線は集計対象外のため除外）
  const highlightsSvg = data.lines
    .filter((l) => !l.isPractice)
    .map((l) => answerCircle(l.cx, l.cy, 6, strokeScale))
    .join('\n    ');

  // 問題用紙 SVG
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${practiceBoxSvg}`,
    `  <g class="lines">`,
    `    ${linesMarkup}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  // 解答用紙 SVG
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${guideSvg}`,
    `  ${practiceBoxSvg}`,
    `  <g class="lines">`,
    `    ${linesMarkup}`,
    `  </g>`,
    `  <g class="highlights">`,
    `    ${highlightsSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  const problemInstruction = 'すべての線分にペンで斜線（または〇）をつけて消してください。';
  const answerInstruction = [
    formatColumnSummary(data.columnStats),
    formatQuadrantSummary(data.quadrantStats),
  ].join('\n');

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction: problemInstruction,
  };

  const answerPage: PageBody = {
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg,
    instruction: answerInstruction,
    subLabel: '【解答・集計シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
    columnStats: data.columnStats,
    quadrantStats: data.quadrantStats,
  };
}

/**
 * サブモードB：線分二等分描画
 */
function renderBisection(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
  data: Extract<M05Data, { subMode: 'bisection' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const strokeScale = params.strokeScale ?? 100;
  const strokeW = (0.6 * strokeScale) / 100;

  // 問題用紙・解答用紙共通のベース線分と番号
  const baseLinesSvg = data.lines
    .map((l) => {
      const numLabel = CIRCLED_NUMBERS[l.index - 1] ?? `${l.index}`;
      const numX = Math.max(3, l.x1 - 6);
      return [
        `<text x="${fmt(numX)}" y="${fmt(l.y)}" font-size="3.5" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="#000000">${numLabel}</text>`,
        `<line x1="${fmt(l.x1)}" y1="${fmt(l.y)}" x2="${fmt(l.x2)}" y2="${fmt(l.y)}" stroke="#000000" stroke-width="${fmt(strokeW)}" stroke-linecap="butt" />`,
      ].join('\n    ');
    })
    .join('\n    ');

  // 解答用紙のスケール・目盛り・記入欄
  // ※印刷実寸（mm）を歪めないため、目盛り線やテキスト座標には textScale を掛けない
  const scalesSvg = data.lines
    .map((l) => {
      const m = l.midpoint;
      const y = l.y;
      const red = ANSWER_STYLE.color;
      const scaleW = ANSWER_STYLE.scaleStrokeMm;

      // 1mm 補助目盛り（m-10..m+10 の整数）
      const subTicks: string[] = [];
      for (let offset = -10; offset <= 10; offset++) {
        if (offset === 0 || Math.abs(offset) === 5 || Math.abs(offset) === 10) {
          continue;
        }
        const tx = m + offset;
        subTicks.push(
          `<line x1="${fmt(tx)}" y1="${fmt(y - 1.5)}" x2="${fmt(tx)}" y2="${fmt(y + 1.5)}" stroke="${red}" stroke-width="0.15" />`,
        );
      }

      // 主要目盛り
      const mainTicks = [
        // ±10mm
        `<line x1="${fmt(m - 10)}" y1="${fmt(y - 4.5)}" x2="${fmt(m - 10)}" y2="${fmt(y + 4.5)}" stroke="${red}" stroke-width="${fmt(scaleW)}" />`,
        `<line x1="${fmt(m + 10)}" y1="${fmt(y - 4.5)}" x2="${fmt(m + 10)}" y2="${fmt(y + 4.5)}" stroke="${red}" stroke-width="${fmt(scaleW)}" />`,
        // ±5mm
        `<line x1="${fmt(m - 5)}" y1="${fmt(y - 3)}" x2="${fmt(m - 5)}" y2="${fmt(y + 3)}" stroke="${red}" stroke-width="${fmt(scaleW)}" />`,
        `<line x1="${fmt(m + 5)}" y1="${fmt(y - 3)}" x2="${fmt(m + 5)}" y2="${fmt(y + 3)}" stroke="${red}" stroke-width="${fmt(scaleW)}" />`,
        // 真の中点 m（赤太線）
        `<line x1="${fmt(m)}" y1="${fmt(y - 6)}" x2="${fmt(m)}" y2="${fmt(y + 6)}" stroke="${red}" stroke-width="${fmt(scaleW * 2)}" />`,
      ].join('\n      ');

      // 目盛りラベル「左10 左5 中 右5 右10」
      const labelY = y + 7.5;
      const labels = [
        `<text x="${fmt(m - 10)}" y="${fmt(labelY)}" font-size="2.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="${red}">左10</text>`,
        `<text x="${fmt(m - 5)}" y="${fmt(labelY)}" font-size="2.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="${red}">左5</text>`,
        `<text x="${fmt(m)}" y="${fmt(labelY)}" font-size="2.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="${red}">中</text>`,
        `<text x="${fmt(m + 5)}" y="${fmt(labelY)}" font-size="2.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="${red}">右5</text>`,
        `<text x="${fmt(m + 10)}" y="${fmt(labelY)}" font-size="2.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="${red}">右10</text>`,
      ].join('\n      ');

      // 右端の偏位・長さ記入欄
      const halfL = l.length / 2;
      const infoText = `L=${l.length}mm (半長${halfL}mm) 偏位: _____mm(左・右)`;
      const infoSvg = `<text x="${fmt(bodyW - 4)}" y="${fmt(y)}" font-size="2.3" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="end" dominant-baseline="central" fill="#333333">${infoText}</text>`;

      return [
        `<g class="scale-item-${l.index}">`,
        subTicks.join('\n      '),
        mainTicks,
        labels,
        infoSvg,
        `</g>`,
      ].join('\n      ');
    })
    .join('\n    ');

  // 問題用紙 SVG
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  <g class="bisection-lines">`,
    `    ${baseLinesSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  // 解答用紙 SVG
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  <g class="bisection-lines">`,
    `    ${baseLinesSvg}`,
    `  </g>`,
    `  <g class="scales">`,
    `    ${scalesSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  const problemInstruction =
    'それぞれの線分のちょうど真ん中（中心）と思うところに、縦の印（｜）をつけてください。';
  const answerInstruction =
    '【採点基準】偏位率(%) = (印の位置 − 真の中点) ÷ (線の長さ/2) × 100（右を＋、左を−）。フッターの50mm校正バーで印刷等倍を確認できます。';

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction: problemInstruction,
  };

  const answerPage: PageBody = {
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg,
    instruction: answerInstruction,
    subLabel: '【解答・偏位測定シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}
