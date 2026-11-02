/**
 * M03 符号変換課題（SDMT様）SVG 描画
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M03Params,
  type PageBody,
  type SymbolDef,
} from '../../../types/schema';
import { fmt } from '../../../utils/html';
import type { M03ProblemData } from './logic';

/**
 * 記号を正規化パス [0, 10] から (cx, cy) にスケーリング描画する。
 */
function renderSymbolPath(
  sym: SymbolDef,
  cx: number,
  cy: number,
  size: number,
  strokeScale: number,
): string {
  const scale = size / 10;
  const targetStrokeMm = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const strokeWInGroup = targetStrokeMm / scale;
  const pathAttrs = sym.filled
    ? `fill="#000000" stroke="none"`
    : `fill="none" stroke="#000000" stroke-width="${fmt(strokeWInGroup)}" stroke-linecap="round" stroke-linejoin="round"`;

  return [
    `<g transform="translate(${fmt(cx)}, ${fmt(cy)}) scale(${fmt(scale)}) translate(-5, -5)">`,
    `  <path d="${sym.path}" ${pathAttrs} />`,
    `</g>`,
  ].join('');
}

/**
 * 上部の対応キー表を描画する。
 */
function renderKeyTable(
  data: M03ProblemData,
  bodyW: number,
  textScale: number,
  strokeScale: number,
): string {
  const pairCount = data.keys.length;
  const keyCellW = Math.min(16, (bodyW - 20) / pairCount);
  const totalW = pairCount * keyCellW;
  const startX = (bodyW - totalW) / 2;
  const startY = 4;
  const halfH = 9.5;
  const totalH = halfH * 2;

  const strokeW = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const thickStrokeW = strokeW * 1.6;

  const symSize = Math.max(3.5, Math.min(keyCellW - 3, halfH - 2.5, 7.5 * (textScale / 100)));
  const fontSize = Math.max(3.5, Math.min(halfH - 2.5, 6 * (textScale / 100)));

  const elements: string[] = [];

  // 外枠（太枠）
  elements.push(
    `<rect x="${fmt(startX)}" y="${fmt(startY)}" width="${fmt(totalW)}" height="${fmt(totalH)}" fill="none" stroke="#000000" stroke-width="${fmt(thickStrokeW)}" />`,
  );
  // 上下段の仕切り線
  elements.push(
    `<line x1="${fmt(startX)}" y1="${fmt(startY + halfH)}" x2="${fmt(startX + totalW)}" y2="${fmt(startY + halfH)}" stroke="#000000" stroke-width="${fmt(strokeW)}" />`,
  );

  // 各セルの区切りと中身
  for (let i = 0; i < pairCount; i++) {
    const key = data.keys[i]!;
    const cx = startX + (i + 0.5) * keyCellW;
    const x = startX + i * keyCellW;

    if (i > 0) {
      elements.push(
        `<line x1="${fmt(x)}" y1="${fmt(startY)}" x2="${fmt(x)}" y2="${fmt(startY + totalH)}" stroke="#000000" stroke-width="${fmt(strokeW)}" />`,
      );
    }

    // 上段：記号
    elements.push(
      renderSymbolPath(key.symbol, cx, startY + halfH * 0.5, symSize, strokeScale),
    );

    // 下段：対応する文字（数字またはひらがな）
    elements.push(
      `<text x="${fmt(cx)}" y="${fmt(startY + halfH * 1.5)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(fontSize)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${key.label}</text>`,
    );
  }

  return `<g class="key-table">\n    ${elements.join('\n    ')}\n  </g>`;
}

/**
 * M03（符号変換課題）の用紙 SVG と結果オブジェクトを生成する。
 */
export function renderM03(
  ctx: GenerateContext,
  params: M03Params & CommonParams,
  data: M03ProblemData,
): GenerateResult {
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;

  const strokeW = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const practiceStrokeW = strokeW * 2.0;

  // 1) キー対応表
  const keyTableSvg = renderKeyTable(data, bodyW, textScale, strokeScale);

  // 2) グリッド寸法計算
  const gridStartY = 28;
  const availH = bodyH - gridStartY - 4;
  const availW = bodyW - 12;

  const cellW = Math.min(16, availW / data.cols);
  const gridW = data.cols * cellW;
  const gridStartX = (bodyW - gridW) / 2;

  const rowGap = Math.max(
    2.5,
    Math.min(4.5, (availH - data.rows * 12) / Math.max(1, data.rows - 1)),
  );
  const rowH = Math.min(22, (availH - (data.rows - 1) * rowGap) / data.rows);
  const topH = rowH * 0.5;
  const bottomH = rowH * 0.5;

  const symSize = Math.max(
    3.5,
    Math.min(cellW - 2.5, topH - 2.5, 6.5 * (textScale / 100)),
  );
  const digitFontSize = Math.max(
    3.5,
    Math.min(bottomH - 2.5, 5.5 * (textScale / 100)),
  );

  // 3) 問題用・解答用グリッドセルの組み立て
  const problemCellsSvg: string[] = [];
  const answerCellsSvg: string[] = [];
  const practiceLabelsSvg: string[] = [];

  let practiceLabelPlacedForFirstRow = false;
  let practiceLabelPlacedForSecondRow = false;

  for (let r = 0; r < data.rows; r++) {
    const rowY = gridStartY + r * (rowH + rowGap);

    for (let c = 0; c < data.cols; c++) {
      const cell = data.grid[r]![c]!;
      const cellX = gridStartX + c * cellW;
      const cx = cellX + cellW / 2;

      const isPrac = cell.isPractice;
      const borderW = isPrac ? practiceStrokeW : strokeW;

      // 練習ラベルの配置（行ごとに最初の練習マスの左上）
      if (isPrac) {
        if (r === 0 && !practiceLabelPlacedForFirstRow) {
          practiceLabelsSvg.push(
            `<text x="${fmt(cellX)}" y="${fmt(rowY - 1.2)}" font-size="2.6" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">【練習】</text>`,
          );
          practiceLabelPlacedForFirstRow = true;
        } else if (r === 1 && !practiceLabelPlacedForSecondRow) {
          practiceLabelsSvg.push(
            `<text x="${fmt(cellX)}" y="${fmt(rowY - 1.2)}" font-size="2.6" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">【練習】</text>`,
          );
          practiceLabelPlacedForSecondRow = true;
        }
      }

      // 共通: 上段マス（記号枠）
      const topRect = `<rect x="${fmt(cellX)}" y="${fmt(rowY)}" width="${fmt(cellW)}" height="${fmt(topH)}" fill="#ffffff" stroke="#000000" stroke-width="${fmt(borderW)}" />`;
      const symSvg = renderSymbolPath(cell.symbol, cx, rowY + topH / 2, symSize, strokeScale);

      // 問題用紙: 下段マス（白塗り記入用空欄）
      const bottomRectProblem = `<rect x="${fmt(cellX)}" y="${fmt(rowY + topH)}" width="${fmt(cellW)}" height="${fmt(bottomH)}" fill="#ffffff" stroke="#000000" stroke-width="${fmt(borderW)}" />`;

      problemCellsSvg.push(
        `<g class="cell" data-row="${r}" data-col="${c}">\n      ${topRect}\n      ${symSvg}\n      ${bottomRectProblem}\n    </g>`,
      );

      // 解答用紙: 下段マス（練習マスは淡グレー＋括弧付き、本課題マスは白＋黒太字）
      const bottomBg = isPrac ? '#f0f0f0' : '#ffffff';
      const bottomRectAnswer = `<rect x="${fmt(cellX)}" y="${fmt(rowY + topH)}" width="${fmt(cellW)}" height="${fmt(bottomH)}" fill="${bottomBg}" stroke="#000000" stroke-width="${fmt(borderW)}" />`;
      const digitSvg = isPrac
        ? `<text x="${fmt(cx)}" y="${fmt(rowY + topH + bottomH / 2)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(digitFontSize * 0.9)}" font-family="${TYPOGRAPHY.fontFamily}" fill="#666666">(${cell.label})</text>`
        : `<text x="${fmt(cx)}" y="${fmt(rowY + topH + bottomH / 2)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(digitFontSize)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${cell.label}</text>`;

      answerCellsSvg.push(
        `<g class="cell" data-row="${r}" data-col="${c}">\n      ${topRect}\n      ${symSvg}\n      ${bottomRectAnswer}\n      ${digitSvg}\n    </g>`,
      );
    }
  }

  // 4) 教示文
  const targetWord = data.targetType === 'digit' ? '数字' : 'ひらがな';
  const problemInstruction =
    `上の対応表をよく見て、下のマスの上段にある記号と同じ記号の下の空欄に、対応する${targetWord}を書いてください。`;

  const answerInstruction = [
    '【正答一覧】',
    `本課題マス数（満点）：${data.mainCells} 点（練習 ${data.practiceCells} マスを除く）`,
    `各マスの下段に正答${targetWord}を記載しています。（　）付きの薄いマスは練習マスです。`,
  ].join('\n');

  // 問題用紙 SVG
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${keyTableSvg}`,
    `  <g class="practice-labels">`,
    `    ${practiceLabelsSvg.join('\n    ')}`,
    `  </g>`,
    `  <g class="grid-cells">`,
    `    ${problemCellsSvg.join('\n    ')}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  // 解答用紙 SVG
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${keyTableSvg}`,
    `  <g class="practice-labels">`,
    `    ${practiceLabelsSvg.join('\n    ')}`,
    `  </g>`,
    `  <g class="grid-cells">`,
    `    ${answerCellsSvg.join('\n    ')}`,
    `  </g>`,
    `</svg>`,
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
    subLabel: '【解答・採点シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}
