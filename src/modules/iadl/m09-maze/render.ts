/**
 * M09: 迷路・ルート探索 SVG 描画
 * ARCHITECTURE.md §5.6, §6, §8, §9 準拠
 */

import { answerPath } from '../../../print/answerParts';
import {
  BODY_BOX,
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M09Params,
  type PageBody,
} from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import type { MazeData, MazeEdge } from './logic';

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * スタート・ゴールのラベルと矢印を描画する
 */
function renderLabelAndArrow(
  label: string,
  isStart: boolean,
  edge: MazeEdge,
  openX: number,
  openY: number,
  fontSize: number,
): string {
  const elements: string[] = [];
  const arrowSize = 2.5;

  let textX = openX;
  let textY = openY;
  let textAnchor: 'start' | 'end' | 'middle' = 'middle';
  let arrowPoints = '';

  if (edge === 'left') {
    if (isStart) {
      // 外側から左開口部へ向かう矢印（右向き）
      // [テキスト] -> [開口]
      textX = openX - 6.0;
      textY = openY;
      textAnchor = 'end';
      const tipX = openX - 0.8;
      const baseEndX = openX - 4.5;
      arrowPoints = `${fmt(tipX)},${fmt(openY)} ${fmt(baseEndX)},${fmt(openY - arrowSize)} ${fmt(baseEndX)},${fmt(openY + arrowSize)}`;
      elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
    } else {
      // 左開口部から外側へ向かう矢印（左向き）
      // [テキスト] <- [開口]
      textX = openX - 6.5;
      textY = openY;
      textAnchor = 'end';
      const tipX = openX - 5.0;
      const baseEndX = openX - 1.2;
      arrowPoints = `${fmt(tipX)},${fmt(openY)} ${fmt(baseEndX)},${fmt(openY - arrowSize)} ${fmt(baseEndX)},${fmt(openY + arrowSize)}`;
      elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
    }
  } else if (edge === 'right') {
    if (isStart) {
      // 外側から右開口部へ向かう矢印（左向き）
      // [開口] <- [テキスト]
      textX = openX + 6.0;
      textY = openY;
      textAnchor = 'start';
      const tipX = openX + 0.8;
      const baseEndX = openX + 4.5;
      arrowPoints = `${fmt(tipX)},${fmt(openY)} ${fmt(baseEndX)},${fmt(openY - arrowSize)} ${fmt(baseEndX)},${fmt(openY + arrowSize)}`;
      elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
    } else {
      // 右開口部から外側へ向かう矢印（右向き）
      // [開口] -> [テキスト]
      textX = openX + 6.5;
      textY = openY;
      textAnchor = 'start';
      const tipX = openX + 5.0;
      const baseEndX = openX + 1.2;
      arrowPoints = `${fmt(tipX)},${fmt(openY)} ${fmt(baseEndX)},${fmt(openY - arrowSize)} ${fmt(baseEndX)},${fmt(openY + arrowSize)}`;
      elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
    }
  } else if (edge === 'top') {
    if (isStart) {
      textX = openX;
      textY = openY - 7;
      const tipY = openY - 0.8;
      const baseY = openY - 4.5;
      arrowPoints = `${fmt(openX)},${fmt(tipY)} ${fmt(openX - arrowSize)},${fmt(baseY)} ${fmt(openX + arrowSize)},${fmt(baseY)}`;
    } else {
      textX = openX;
      textY = openY - 9;
      const tipY = openY - 5.5;
      const baseY = openY - 1.5;
      arrowPoints = `${fmt(openX)},${fmt(tipY)} ${fmt(openX - arrowSize)},${fmt(baseY)} ${fmt(openX + arrowSize)},${fmt(baseY)}`;
    }
    elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
  } else if (edge === 'bottom') {
    if (isStart) {
      textX = openX;
      textY = openY + 7;
      const tipY = openY + 0.8;
      const baseY = openY + 4.5;
      arrowPoints = `${fmt(openX)},${fmt(tipY)} ${fmt(openX - arrowSize)},${fmt(baseY)} ${fmt(openX + arrowSize)},${fmt(baseY)}`;
    } else {
      textX = openX;
      textY = openY + 9;
      const tipY = openY + 5.5;
      const baseY = openY + 1.5;
      arrowPoints = `${fmt(openX)},${fmt(tipY)} ${fmt(openX - arrowSize)},${fmt(baseY)} ${fmt(openX + arrowSize)},${fmt(baseY)}`;
    }
    elements.push(`<polygon points="${arrowPoints}" fill="${TYPOGRAPHY.inkColor}" />`);
  }

  elements.push(
    `<text x="${fmt(textX)}" y="${fmt(textY)}" text-anchor="${textAnchor}" dominant-baseline="central" font-size="${fmt(fontSize)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="${TYPOGRAPHY.inkColor}">${esc(label)}</text>`,
  );

  return elements.join('\n    ');
}

/**
 * 迷路 SVG の中身を構築する
 */
export function renderMazeSvg(
  maze: MazeData,
  bodyW: number,
  bodyH: number,
  strokeScale: number,
  textScale: number,
  isAnswer: boolean,
): string {
  const N = maze.gridSize;
  const strokeW = (TYPOGRAPHY.baseStrokeMm * 1.5 * strokeScale) / 100;
  // 縦向きでも左右にスタート・ゴールラベル用の余白（片側26mm以上）を確保する
  const cellMm = Math.min(bodyW - 52, bodyH - 16) / N;
  const mazeW = cellMm * N;
  const mazeH = cellMm * N;
  const originX = (bodyW - mazeW) / 2;
  const originY = (bodyH - mazeH) / 2;

  const wallLines: string[] = [];

  // 水平壁
  for (let r = 0; r <= N; r++) {
    const y = originY + r * cellMm;
    for (let c = 0; c < N; c++) {
      const row = maze.horizontalWalls[r];
      if (row !== undefined && row[c]) {
        const x1 = originX + c * cellMm;
        const x2 = originX + (c + 1) * cellMm;
        wallLines.push(
          `<line x1="${fmt(x1)}" y1="${fmt(y)}" x2="${fmt(x2)}" y2="${fmt(y)}" stroke="${TYPOGRAPHY.inkColor}" stroke-width="${fmt(strokeW)}" stroke-linecap="round" />`,
        );
      }
    }
  }

  // 垂直壁
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      const row = maze.verticalWalls[r];
      if (row !== undefined && row[c]) {
        const x = originX + c * cellMm;
        const y1 = originY + r * cellMm;
        const y2 = originY + (r + 1) * cellMm;
        wallLines.push(
          `<line x1="${fmt(x)}" y1="${fmt(y1)}" x2="${fmt(x)}" y2="${fmt(y2)}" stroke="${TYPOGRAPHY.inkColor}" stroke-width="${fmt(strokeW)}" stroke-linecap="round" />`,
        );
      }
    }
  }

  // スタート・ゴールの開口部座標
  const getOpenCoord = (cell: { row: number; col: number }, edge: MazeEdge): { x: number; y: number } => {
    switch (edge) {
      case 'left':
        return { x: originX, y: originY + (cell.row + 0.5) * cellMm };
      case 'right':
        return { x: originX + mazeW, y: originY + (cell.row + 0.5) * cellMm };
      case 'top':
        return { x: originX + (cell.col + 0.5) * cellMm, y: originY };
      case 'bottom':
        return { x: originX + (cell.col + 0.5) * cellMm, y: originY + mazeH };
    }
  };

  const startCoord = getOpenCoord(maze.start, maze.startEdge);
  const goalCoord = getOpenCoord(maze.goal, maze.goalEdge);

  // 文字倍率を上げても左右余白（26mm）からはみ出さないよう上限 4.6mm にクランプ
  const labelFontSize = Math.min(
    4.6,
    Math.max(3.0, Math.min(4.5, cellMm * 0.5)) * (textScale / 100),
  );

  const startMarkerSvg = renderLabelAndArrow(
    'スタート',
    true,
    maze.startEdge,
    startCoord.x,
    startCoord.y,
    labelFontSize,
  );

  const goalMarkerSvg = renderLabelAndArrow(
    'ゴール',
    false,
    maze.goalEdge,
    goalCoord.x,
    goalCoord.y,
    labelFontSize,
  );

  // 解答経路（赤太破線）
  let answerPathSvg = '';
  if (isAnswer && maze.solutionPath.length > 0) {
    const points: Point[] = [];

    // スタート外側点から接続
    const startOffset = maze.startEdge === 'left' ? -0.5 : maze.startEdge === 'right' ? 0.5 : 0;
    const startOffsetY = maze.startEdge === 'top' ? -0.5 : maze.startEdge === 'bottom' ? 0.5 : 0;
    points.push({ x: startCoord.x + startOffset, y: startCoord.y + startOffsetY });

    for (const cell of maze.solutionPath) {
      points.push({
        x: originX + (cell.col + 0.5) * cellMm,
        y: originY + (cell.row + 0.5) * cellMm,
      });
    }

    // ゴール外側点へ抜ける
    const goalOffset = maze.goalEdge === 'left' ? -0.5 : maze.goalEdge === 'right' ? 0.5 : 0;
    const goalOffsetY = maze.goalEdge === 'top' ? -0.5 : maze.goalEdge === 'bottom' ? 0.5 : 0;
    points.push({ x: goalCoord.x + goalOffset, y: goalCoord.y + goalOffsetY });

    answerPathSvg = `  <g class="answer-path">\n    ${answerPath(points, strokeScale)}\n  </g>`;
  }

  return [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    answerPathSvg,
    `  <g class="maze-walls">`,
    `    ${wallLines.join('\n    ')}`,
    `  </g>`,
    `  <g class="maze-markers">`,
    `    ${startMarkerSvg}`,
    `    ${goalMarkerSvg}`,
    `  </g>`,
    `</svg>`,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * M09 レンダリング主関数
 */
export function renderM09(
  _ctx: GenerateContext,
  params: M09Params & CommonParams,
  data: MazeData,
): GenerateResult {
  const body = BODY_BOX[params.orientation];
  const strokeScale = params.strokeScale ?? 100;
  const textScale = params.textScale ?? 100;

  const problemSvg = renderMazeSvg(data, body.widthMm, body.heightMm, strokeScale, textScale, false);
  const answerSvg = renderMazeSvg(data, body.widthMm, body.heightMm, strokeScale, textScale, true);

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction: 'スタートからゴールまで、壁にぶつからないように線で進みましょう。',
  };

  const answerPage: PageBody = {
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg,
    instruction: `【解答】最短ルート：${data.solutionPath.length} マス`,
    subLabel: '【解答・採点シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}
