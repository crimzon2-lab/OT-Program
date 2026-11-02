/**
 * M07 連続計算・紙面N-back SVG 描画
 * ARCHITECTURE.md §6, §8, §9 準拠
 */

import { answerCircle } from '../../../print/answerParts';
import {
  ANSWER_STYLE,
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M07Params,
  type PageBody,
} from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import type { M07Data } from './logic';

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
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
];

/**
 * M07 レンダリング
 */
export function renderM07(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
  data: M07Data,
): GenerateResult {
  if (data.subMode === 'serialAddition') {
    return renderSerialAddition(ctx, params, data);
  }
  return renderNBack(ctx, params, data);
}

/**
 * サブモードA：連続加算描画
 */
function renderSerialAddition(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
  data: Extract<M07Data, { subMode: 'serialAddition' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;

  const numRows = data.rows.length;
  const numDigits = params.additionDigits;

  const topPad = 6;
  const bottomPad = 6;
  const rowH = (bodyH - topPad - bottomPad) / numRows;

  // 横方向レイアウト
  const leftMargin = 12; // 行番号エリア
  const rightMargin = 28; // 計上欄エリア
  const availW = bodyW - leftMargin - rightMargin;
  const pitch = availW / (numDigits - 1);

  // 文字サイズと記入枠サイズの算出・クランプ
  const maxCharW = pitch * 0.65;
  const maxCharH = rowH * 0.42;
  const baseSize = 4.0;
  const desiredSize = baseSize * (textScale / 100);
  let effectiveSize = desiredSize;

  if (effectiveSize > Math.min(maxCharW, maxCharH)) {
    effectiveSize = Math.max(2.5, Math.min(maxCharW, maxCharH));
    if (effectiveSize < desiredSize) {
      ctx.warn(
        'LAYOUT_SCALED',
        '文字のはみ出しを防ぐため文字サイズを縮小調整しました',
      );
    }
  }

  const boxW = Math.max(3.2, Math.min(pitch * 0.7, 5.5));
  const boxH = Math.max(3.2, Math.min(rowH * 0.38, 5.5));
  const boxStrokeW = (0.3 * strokeScale) / 100;

  const problemRowsSvg: string[] = [];
  const answerRowsSvg: string[] = [];

  for (let r = 0; r < numRows; r++) {
    const row = data.rows[r]!;
    const rowCenterY = topPad + (r + 0.5) * rowH;
    const digitY = rowCenterY - rowH * 0.16;
    const boxCenterY = rowCenterY + rowH * 0.22;

    const rowNumLabel = CIRCLED_NUMBERS[r] ?? `${r + 1}`;
    const rowNumSvg = `<text x="5" y="${fmt(digitY)}" font-size="3.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="#555555">${rowNumLabel}</text>`;

    // 数字列 SVG
    const digitsSvg = row.digits
      .map((d, c) => {
        const x = leftMargin + c * pitch;
        return `<text x="${fmt(x)}" y="${fmt(digitY)}" font-size="${fmt(effectiveSize)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="#000000">${d}</text>`;
      })
      .join('\n      ');

    // 記入欄 SVG（問題用と解答用）
    const problemBoxesSvg: string[] = [];
    const answerBoxesSvg: string[] = [];

    for (let c = 0; c < row.answers.length; c++) {
      const midX = leftMargin + (c + 0.5) * pitch;
      const ansVal = row.answers[c]!;

      // 記入小枠
      const boxRect = `<rect x="${fmt(midX - boxW / 2)}" y="${fmt(boxCenterY - boxH / 2)}" width="${fmt(boxW)}" height="${fmt(boxH)}" rx="0.5" fill="none" stroke="#888888" stroke-width="${fmt(boxStrokeW)}" />`;

      problemBoxesSvg.push(boxRect);

      // 解答用紙には枠内に赤太字で正答数字
      const ansText = `<text x="${fmt(midX)}" y="${fmt(boxCenterY)}" font-size="${fmt(effectiveSize * 0.9)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="${ANSWER_STYLE.color}">${ansVal}</text>`;
      answerBoxesSvg.push(boxRect + ansText);
    }

    // 行末計上欄
    const countX = bodyW - rightMargin + 4;
    const problemCountSvg = `<text x="${fmt(countX)}" y="${fmt(rowCenterY)}" font-size="2.6" font-family="${TYPOGRAPHY.fontFamily}" dominant-baseline="central" fill="#555555">正答: ___ / ${row.answers.length}</text>`;
    const answerCountSvg = `<text x="${fmt(countX)}" y="${fmt(rowCenterY)}" font-size="2.6" font-family="${TYPOGRAPHY.fontFamily}" dominant-baseline="central" fill="#111111">全 ${row.answers.length} 問</text>`;

    // 行区切り線（薄い線）
    const divider =
      r < numRows - 1
        ? `<line x1="4" y1="${fmt(topPad + (r + 1) * rowH)}" x2="${fmt(bodyW - 4)}" y2="${fmt(topPad + (r + 1) * rowH)}" stroke="#eeeeee" stroke-width="0.25" />`
        : '';

    problemRowsSvg.push(
      [
        `<g class="row-${r + 1}">`,
        divider,
        rowNumSvg,
        digitsSvg,
        problemBoxesSvg.join('\n      '),
        problemCountSvg,
        `</g>`,
      ].join('\n    '),
    );

    answerRowsSvg.push(
      [
        `<g class="row-${r + 1}">`,
        divider,
        rowNumSvg,
        digitsSvg,
        answerBoxesSvg.join('\n      '),
        answerCountSvg,
        `</g>`,
      ].join('\n    '),
    );
  }

  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${problemRowsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${answerRowsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const problemInstruction =
    '隣り合う2つの数字を足し算し、その答えの1の位（下一桁）を下の枠に書いてください。';
  const answerInstruction = `【解答】各枠内の赤数字は隣り合う2数の和の1の位です（全${data.totalProblems}問）。`;

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
    subLabel: '【解答・模範数値シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}

/**
 * サブモードB：紙面N-back描画
 */
function renderNBack(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
  data: Extract<M07Data, { subMode: 'nBack' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;

  const numRows = data.rows.length;
  const length = params.nBackLength;
  const n = data.n;

  const topPad = 6;
  const bottomPad = 6;
  const rowH = (bodyH - topPad - bottomPad) / numRows;

  const leftMargin = 10;
  const rightMargin = 26;
  const availW = bodyW - leftMargin - rightMargin;
  const cellPitch = availW / length;

  // セル寸法
  const maxBoxSize = Math.min(cellPitch - 1.2, rowH * 0.65, 12);
  const boxW = maxBoxSize;
  const boxH = maxBoxSize;
  const boxStrokeW = (0.3 * strokeScale) / 100;

  // 文字サイズの算出・クランプ
  const baseFontSize = boxH * 0.55;
  const desiredFontSize = baseFontSize * (textScale / 100);
  let effectiveFontSize = desiredFontSize;

  if (effectiveFontSize > boxH * 0.72) {
    effectiveFontSize = Math.max(3.0, boxH * 0.72);
    if (effectiveFontSize < desiredFontSize) {
      ctx.warn(
        'LAYOUT_SCALED',
        '文字のはみ出しを防ぐためマス内の文字サイズを縮小調整しました',
      );
    }
  }

  const problemRowsSvg: string[] = [];
  const answerRowsSvg: string[] = [];

  for (let r = 0; r < numRows; r++) {
    const row = data.rows[r]!;
    const rowCenterY = topPad + (r + 0.5) * rowH;
    const rowNumLabel = CIRCLED_NUMBERS[r] ?? `${r + 1}`;
    const rowNumSvg = `<text x="5" y="${fmt(rowCenterY)}" font-size="3.2" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="#555555">${rowNumLabel}</text>`;

    const problemCellsSvg: string[] = [];
    const answerCellsSvg: string[] = [];

    for (let c = 0; c < row.items.length; c++) {
      const it = row.items[c]!;
      const cellCenterX = leftMargin + (c + 0.5) * cellPitch;
      const cellX = cellCenterX - boxW / 2;
      const cellY = rowCenterY - boxH / 2;

      // セル枠
      let fill = '#ffffff';
      let startLabelSvg = '';

      if (it.isStart) {
        // 先頭 n 個：開始枠（淡いグレー背景）
        fill = '#f5f5f5';
        startLabelSvg = `<text x="${fmt(cellCenterX)}" y="${fmt(cellY + boxH + 2.5)}" font-size="2.0" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="#888888">開始</text>`;
      }

      const cellRect = `<rect x="${fmt(cellX)}" y="${fmt(cellY)}" width="${fmt(boxW)}" height="${fmt(boxH)}" rx="0.8" fill="${fill}" stroke="#000000" stroke-width="${fmt(boxStrokeW)}" />`;
      const charText = `<text x="${fmt(cellCenterX)}" y="${fmt(rowCenterY)}" font-size="${fmt(effectiveFontSize)}" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="#000000">${esc(it.char)}</text>`;

      problemCellsSvg.push(cellRect + charText + startLabelSvg);

      // 解答用紙：一致項目を赤丸（answerCircle）でハイライト
      let highlightSvg = '';
      if (it.isMatch) {
        highlightSvg = answerCircle(cellCenterX, rowCenterY, boxH * 0.85, strokeScale);
      }
      answerCellsSvg.push(cellRect + charText + highlightSvg + startLabelSvg);
    }

    // 行末の一致数表示
    const countX = bodyW - rightMargin + 4;
    const problemCountSvg = `<text x="${fmt(countX)}" y="${fmt(rowCenterY)}" font-size="2.6" font-family="${TYPOGRAPHY.fontFamily}" dominant-baseline="central" fill="#555555">一致: ___ 個</text>`;
    const answerCountSvg = `<text x="${fmt(countX)}" y="${fmt(rowCenterY)}" font-size="2.6" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" dominant-baseline="central" fill="${ANSWER_STYLE.color}">正解: ${row.matchCount} 個</text>`;

    // 行区切り線
    const divider =
      r < numRows - 1
        ? `<line x1="4" y1="${fmt(topPad + (r + 1) * rowH)}" x2="${fmt(bodyW - 4)}" y2="${fmt(topPad + (r + 1) * rowH)}" stroke="#eeeeee" stroke-width="0.25" />`
        : '';

    problemRowsSvg.push(
      [
        `<g class="nback-row-${r + 1}">`,
        divider,
        rowNumSvg,
        problemCellsSvg.join('\n      '),
        problemCountSvg,
        `</g>`,
      ].join('\n    '),
    );

    answerRowsSvg.push(
      [
        `<g class="nback-row-${r + 1}">`,
        divider,
        rowNumSvg,
        answerCellsSvg.join('\n      '),
        answerCountSvg,
        `</g>`,
      ].join('\n    '),
    );
  }

  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${problemRowsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${answerRowsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const stepDesc = n === 1 ? '1つ前（すぐ左）' : '2つ前';
  const problemInstruction = `左から順に見て、${stepDesc}のマスと同じ文字（数字）が出たら、そのマスに〇をつけてください。`;
  const answerInstruction = `【解答】赤丸は${stepDesc}のマスと一致するターゲットです（総一致数: ${data.totalMatches} 個）。`;

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
    subLabel: '【解答・正解判定シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}
