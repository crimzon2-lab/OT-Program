/**
 * M06 点つなぎ図形模写・空間記憶マトリクス SVG 描画
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  ANSWER_STYLE,
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M06Params,
  type PageBody,
} from '../../../types/schema';
import { fmt } from '../../../utils/html';
import type { M06Data, MatrixItem } from './logic';

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
];

/**
 * M06 レンダリング
 */
export function renderM06(
  ctx: GenerateContext,
  params: M06Params & CommonParams,
  data: M06Data,
): GenerateResult {
  if (data.subMode === 'dotCopy') {
    return renderDotCopy(ctx, params, data);
  }
  return renderSpatialMatrix(ctx, params, data);
}

/**
 * サブモードA：点つなぎ図形模写描画
 */
function renderDotCopy(
  ctx: GenerateContext,
  params: M06Params & CommonParams,
  data: Extract<M06Data, { subMode: 'dotCopy' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const strokeScale = params.strokeScale ?? 100;
  const lineStrokeW = (0.8 * strokeScale) / 100;
  const dotRadius = 1.2;

  const count = data.figures.length;
  const layout = params.copyLayout;

  const problemFigsSvg: string[] = [];
  const answerFigsSvg: string[] = [];

  // 各図形の割り当て領域（縦方向に count 等分）
  const itemH = (bodyH - 8) / count;

  for (let i = 0; i < count; i++) {
    const fig = data.figures[i]!;
    const itemY = 4 + i * itemH;
    const grid = fig.grid;

    let sampleX: number;
    let sampleY: number;
    let copyX: number;
    let copyY: number;
    let gridSpan: number;

    if (layout === 'leftRight') {
      const colW = (bodyW - 12) / 2;
      gridSpan = Math.min(colW - 16, itemH - 18, 55);
      sampleX = 6 + (colW - gridSpan) / 2;
      sampleY = itemY + 12 + (itemH - 14 - gridSpan) / 2;
      copyX = 6 + colW + (colW - gridSpan) / 2;
      copyY = sampleY;
    } else {
      // topBottom
      const subH = (itemH - 18) / 2;
      gridSpan = Math.min(bodyW - 40, subH - 6, 45);
      sampleX = (bodyW - gridSpan) / 2;
      sampleY = itemY + 10;
      copyX = sampleX;
      copyY = sampleY + gridSpan + 8;
    }

    const step = gridSpan / (grid - 1);

    // ドット描画ヘルパー
    const renderDots = (ox: number, oy: number) => {
      const dots: string[] = [];
      for (let r = 0; r < grid; r++) {
        for (let c = 0; c < grid; c++) {
          const dx = ox + c * step;
          const dy = oy + r * step;
          dots.push(
            `<circle cx="${fmt(dx)}" cy="${fmt(dy)}" r="${fmt(dotRadius)}" fill="#000000" />`,
          );
        }
      }
      return dots.join('\n      ');
    };

    // 見本セグメント描画（太黒線）
    const sampleSegmentsSvg = fig.segments
      .map((seg) => {
        const x1 = sampleX + seg.from.c * step;
        const y1 = sampleY + seg.from.r * step;
        const x2 = sampleX + seg.to.c * step;
        const y2 = sampleY + seg.to.r * step;
        return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="#000000" stroke-width="${fmt(lineStrokeW)}" stroke-linecap="round" />`;
      })
      .join('\n      ');

    // 問題用紙の各問
    const figNum = CIRCLED_NUMBERS[i] ?? `${i + 1}`;
    const pTitle = `<text x="6" y="${fmt(itemY + 6)}" font-size="3.5" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">図形 ${figNum}</text>`;
    const sLabel = `<text x="${fmt(sampleX + gridSpan / 2)}" y="${fmt(sampleY - 3)}" font-size="2.8" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="#555555">【見本】</text>`;
    const cLabel = `<text x="${fmt(copyX + gridSpan / 2)}" y="${fmt(copyY - 3)}" font-size="2.8" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="#555555">【模写】</text>`;

    // 区切り線（2問目以降）
    const divider =
      i > 0
        ? `<line x1="6" y1="${fmt(itemY - 2)}" x2="${fmt(bodyW - 6)}" y2="${fmt(itemY - 2)}" stroke="#dddddd" stroke-width="0.3" stroke-dasharray="2 2" />`
        : '';

    problemFigsSvg.push(
      [
        `<g class="fig-${i + 1}">`,
        divider,
        pTitle,
        sLabel,
        cLabel,
        // 見本側
        `<g class="sample-grid">`,
        sampleSegmentsSvg,
        renderDots(sampleX, sampleY),
        `</g>`,
        // 模写側
        `<g class="copy-grid">`,
        renderDots(copyX, copyY),
        `</g>`,
        `</g>`,
      ].join('\n    '),
    );

    // 解答用紙：各セグメントに番号付き＋採点情報
    const answerSegmentsWithNumbers = fig.segments
      .map((seg) => {
        const x1 = sampleX + seg.from.c * step;
        const y1 = sampleY + seg.from.r * step;
        const x2 = sampleX + seg.to.c * step;
        const y2 = sampleY + seg.to.r * step;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const numLabel = CIRCLED_NUMBERS[seg.index - 1] ?? `${seg.index}`;

        return [
          `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${ANSWER_STYLE.color}" stroke-width="${fmt(lineStrokeW)}" stroke-linecap="round" />`,
          `<circle cx="${fmt(midX)}" cy="${fmt(midY)}" r="2.2" fill="#ffffff" stroke="${ANSWER_STYLE.color}" stroke-width="0.3" />`,
          `<text x="${fmt(midX)}" y="${fmt(midY)}" font-size="2.4" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" dominant-baseline="central" fill="${ANSWER_STYLE.color}">${numLabel}</text>`,
        ].join('\n      ');
      })
      .join('\n      ');

    // 採点表テキスト
    const checkText1 = `線分総数: ${fig.totalSegments} 本 （左側: ${fig.leftSegments} 本 ／ 右側: ${fig.rightSegments} 本）`;
    const checkText2 = `正答線分数: ______ ／ ${fig.totalSegments} 本`;
    const checkX = copyX;
    const checkY = copyY + gridSpan / 2 - 4;

    const checkTableSvg = [
      `<g class="scoring-box">`,
      `  <rect x="${fmt(checkX)}" y="${fmt(checkY - 8)}" width="${fmt(gridSpan)}" height="26" fill="#fcfcfc" stroke="#aaaaaa" stroke-width="0.3" rx="1" />`,
      `  <text x="${fmt(checkX + 3)}" y="${fmt(checkY - 2)}" font-size="2.6" font-family="${TYPOGRAPHY.fontFamily}" fill="#333333">【採点・USN評価】</text>`,
      `  <text x="${fmt(checkX + 3)}" y="${fmt(checkY + 4)}" font-size="2.4" font-family="${TYPOGRAPHY.fontFamily}" fill="#555555">${checkText1}</text>`,
      `  <text x="${fmt(checkX + 3)}" y="${fmt(checkY + 11)}" font-size="2.6" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#111111">${checkText2}</text>`,
      `</g>`,
    ].join('\n    ');

    answerFigsSvg.push(
      [
        `<g class="answer-fig-${i + 1}">`,
        divider,
        pTitle,
        `<text x="${fmt(sampleX + gridSpan / 2)}" y="${fmt(sampleY - 3)}" font-size="2.8" font-family="${TYPOGRAPHY.fontFamily}" text-anchor="middle" fill="#555555">【正解図形】</text>`,
        `<g class="sample-grid">`,
        answerSegmentsWithNumbers,
        renderDots(sampleX, sampleY),
        `</g>`,
        checkTableSvg,
        `</g>`,
      ].join('\n    '),
    );
  }

  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${problemFigsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${answerFigsSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const instDir = layout === 'leftRight' ? '左の見本と同じ形を、右' : '上の見本と同じ形を、下';
  const problemInstruction = `${instDir}の点と点を直線で結んで写してください。`;
  const answerInstruction =
    '【採点基準】左右それぞれの半側での線分脱落の有無を確認し、半側空間無視の傾向を評価します。';

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

/**
 * サブモードB：空間記憶マトリクス描画
 */
function renderSpatialMatrix(
  ctx: GenerateContext,
  _params: M06Params & CommonParams,
  data: Extract<M06Data, { subMode: 'spatialMatrix' }>,
): GenerateResult {
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;
  const count = data.matrices.length;
  const size = data.matrixSize;

  // グリッド配置（行数・列数を算出）
  let cols = 1;
  let rows = count;
  if (count >= 4) {
    cols = 2;
    rows = Math.ceil(count / 2);
  } else if (count === 3) {
    cols = ctx.body.widthMm > ctx.body.heightMm ? 3 : 1;
    rows = ctx.body.widthMm > ctx.body.heightMm ? 1 : 3;
  } else if (count === 2) {
    cols = ctx.body.widthMm > ctx.body.heightMm ? 2 : 1;
    rows = ctx.body.widthMm > ctx.body.heightMm ? 1 : 2;
  }

  const cellBoxW = bodyW / cols;
  const cellBoxH = bodyH / rows;

  // 1つのマトリクスの外寸
  const matrixW = Math.min(cellBoxW - 16, cellBoxH - 24, 75);
  const cellSize = matrixW / size;

  // マトリクス描画関数
  const renderSingleMatrix = (
    mat: MatrixItem,
    ox: number,
    oy: number,
    isStimulus: boolean,
    isAnswer: boolean,
  ) => {
    const numLabel = CIRCLED_NUMBERS[mat.index - 1] ?? `${mat.index}`;
    const titleSvg = `<text x="${fmt(ox)}" y="${fmt(oy - 4)}" font-size="3.5" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">問題 ${numLabel}</text>`;

    const filledSet = new Set(mat.filledIndices);
    const cellsSvg: string[] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const x = ox + c * cellSize;
        const y = oy + r * cellSize;
        const isFilled = filledSet.has(idx);

        if (isStimulus) {
          // 提示用シート：黒塗りセルは #111111 で塗りつぶし
          const fill = isFilled ? '#111111' : '#ffffff';
          cellsSvg.push(
            `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(cellSize)}" height="${fmt(cellSize)}" fill="${fill}" stroke="#000000" stroke-width="0.3" />`,
          );
        } else if (isAnswer) {
          // 解答シート：正解セルを #111111 かつ赤枠で強調
          const fill = isFilled ? '#111111' : '#ffffff';
          cellsSvg.push(
            `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(cellSize)}" height="${fmt(cellSize)}" fill="${fill}" stroke="#000000" stroke-width="0.3" />`,
          );
        } else {
          // 回答シート：全セル白抜き（患者記入用）
          cellsSvg.push(
            `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(cellSize)}" height="${fmt(cellSize)}" fill="#ffffff" stroke="#000000" stroke-width="0.3" />`,
          );
        }
      }
    }

    // 外枠（太め）
    const outerRect = `<rect x="${fmt(ox)}" y="${fmt(oy)}" width="${fmt(matrixW)}" height="${fmt(matrixW)}" fill="none" stroke="#000000" stroke-width="0.6" />`;

    // 解答用紙用の正答セル座標と正答数記入欄
    let footerSvg = '';
    if (isAnswer) {
      const coordLabels = mat.filledCoords
        .map((p) => `(${p.r + 1}, ${p.c + 1})`)
        .join(', ');
      footerSvg = [
        `<text x="${fmt(ox)}" y="${fmt(oy + matrixW + 5)}" font-size="2.4" font-family="${TYPOGRAPHY.fontFamily}" fill="${ANSWER_STYLE.color}">正解セル: ${coordLabels}</text>`,
        `<text x="${fmt(ox)}" y="${fmt(oy + matrixW + 9)}" font-size="2.6" font-family="${TYPOGRAPHY.fontFamily}" fill="#111111">正答数: _____ ／ ${data.filledCells}</text>`,
      ].join('\n      ');
    }

    return [
      `<g class="matrix-${mat.index}">`,
      titleSvg,
      cellsSvg.join('\n      '),
      outerRect,
      footerSvg,
      `</g>`,
    ].join('\n    ');
  };

  const stimulusMatricesSvg: string[] = [];
  const problemMatricesSvg: string[] = [];
  const answerMatricesSvg: string[] = [];

  for (let idx = 0; idx < count; idx++) {
    const mat = data.matrices[idx]!;
    const cIdx = idx % cols;
    const rIdx = Math.floor(idx / cols);

    const boxX = cIdx * cellBoxW;
    const boxY = rIdx * cellBoxH;
    const ox = boxX + (cellBoxW - matrixW) / 2;
    const oy = boxY + (cellBoxH - matrixW) / 2 + 2;

    stimulusMatricesSvg.push(renderSingleMatrix(mat, ox, oy, true, false));
    problemMatricesSvg.push(renderSingleMatrix(mat, ox, oy, false, false));
    answerMatricesSvg.push(renderSingleMatrix(mat, ox, oy, false, true));
  }

  // 1. 提示用シート（stimulus）
  const stimulusSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${stimulusMatricesSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  // 2. 回答シート（problem）
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${problemMatricesSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  // 3. 解答シート（answer）
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${answerMatricesSvg.join('\n  ')}`,
    `</svg>`,
  ].join('\n');

  const stimulusPage: PageBody = {
    pageRole: 'stimulus',
    kind: 'svg',
    markup: stimulusSvg,
    instruction:
      '各マスの黒く塗られた位置をよく覚えてください。（指定時間提示後、回答シートに交代）',
    subLabel: '【提示用シート】',
  };

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction:
      '先ほど覚えた黒いマスの位置を、同じように鉛筆で塗りつぶしてください。',
    subLabel: '【回答シート】',
  };

  const answerPage: PageBody = {
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg,
    instruction:
      '【採点基準】正しく再現できたマス数を確認し、空間記憶の保持能を評価します。',
    subLabel: '【解答・採点シート（検者用）】',
  };

  return {
    pages: [stimulusPage, problemPage, answerPage],
  };
}
