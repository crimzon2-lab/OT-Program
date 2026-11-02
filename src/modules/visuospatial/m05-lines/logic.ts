/**
 * M05 線分抹消・線分二等分 生成ロジック
 * ARCHITECTURE.md §5.2, §8, §9 準拠
 */

import type {
  Column3,
  ColumnStats,
  CommonParams,
  GenerateContext,
  M05Params,
  QuadrantStats,
} from '../../../types/schema';
import {
  computeColumnStats,
  computeQuadrantStats,
  dist,
  type Rect,
  type StatItem,
} from '../../../utils/geometry';

export interface CancellationLine {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly angle: number;
  readonly length: number;
  readonly isPractice: boolean;
  readonly col: Column3;
  readonly row: 'top' | 'bottom';
}

export interface BisectionLine {
  readonly id: string;
  readonly index: number;
  readonly y: number;
  readonly length: number;
  readonly offset: number;
  readonly x1: number;
  readonly x2: number;
  readonly midpoint: number;
}

export interface PracticeBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type M05Data =
  | {
      readonly subMode: 'cancellation';
      readonly lines: readonly CancellationLine[];
      readonly practiceBox?: PracticeBox;
      readonly columnStats: ColumnStats;
      readonly quadrantStats: QuadrantStats;
    }
  | {
      readonly subMode: 'bisection';
      readonly lines: readonly BisectionLine[];
    };

/**
 * M05 問題データを生成する
 */
export function generateM05Data(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
): M05Data {
  if (params.subMode === 'cancellation') {
    return generateCancellationData(ctx, params);
  }
  return generateBisectionData(ctx, params);
}

/**
 * サブモードA：線分抹消データ生成
 */
function generateCancellationData(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
): M05Data {
  const W = ctx.body.widthMm;
  const H = ctx.body.heightMm;
  const L = params.lineLengthMm;
  const minSpacing = L * 0.85;

  const colWidth = W / 3;
  const rowHeight = H / 2;

  const allLines: CancellationLine[] = [];
  const statItems: StatItem[] = [];

  // 中央練習枠（centerPractice === true 時）
  let practiceBox: PracticeBox | undefined;
  const practiceLines: CancellationLine[] = [];

  if (params.centerPractice) {
    const pbW = Math.min(colWidth * 0.9, 70);
    const pbH = Math.min(rowHeight * 0.7, 50);
    practiceBox = {
      x: (W - pbW) / 2,
      y: (H - pbH) / 2,
      w: pbW,
      h: pbH,
    };

    // 練習線4本を中央枠内に配置
    const practiceCount = 4;
    const pMargin = L / 2 + 2;
    for (let pIdx = 0; pIdx < practiceCount; pIdx++) {
      let placed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const cx = ctx.rng.float(
          practiceBox.x + pMargin,
          practiceBox.x + practiceBox.w - pMargin,
        );
        const cy = ctx.rng.float(
          practiceBox.y + pMargin,
          practiceBox.y + practiceBox.h - pMargin,
        );
        const angle = ctx.rng.float(0, Math.PI);

        // 他の練習線との衝突判定
        const collision = practiceLines.some(
          (pl) => dist({ x: cx, y: cy }, { x: pl.cx, y: pl.cy }) < minSpacing * 0.8,
        );
        if (collision) continue;

        const dx = (L / 2) * Math.cos(angle);
        const dy = (L / 2) * Math.sin(angle);
        const line: CancellationLine = {
          id: `p-${pIdx + 1}`,
          cx,
          cy,
          x1: cx - dx,
          y1: cy - dy,
          x2: cx + dx,
          y2: cy + dy,
          angle,
          length: L,
          isPractice: true,
          col: 'center',
          row: cy < H / 2 ? 'top' : 'bottom',
        };
        practiceLines.push(line);
        statItems.push({ x: cx, y: cy, isTarget: false, isPractice: true });
        placed = true;
        break;
      }
      if (!placed) {
        // フォールバック配置
        const cx = practiceBox.x + practiceBox.w / 2 + (pIdx - 1.5) * 8;
        const cy = practiceBox.y + practiceBox.h / 2;
        const angle = (pIdx * Math.PI) / 4;
        const dx = (L / 2) * Math.cos(angle);
        const dy = (L / 2) * Math.sin(angle);
        const line: CancellationLine = {
          id: `p-${pIdx + 1}`,
          cx,
          cy,
          x1: cx - dx,
          y1: cy - dy,
          x2: cx + dx,
          y2: cy + dy,
          angle,
          length: L,
          isPractice: true,
          col: 'center',
          row: cy < H / 2 ? 'top' : 'bottom',
        };
        practiceLines.push(line);
        statItems.push({ x: cx, y: cy, isTarget: false, isPractice: true });
      }
    }
  }

  // 6区画（左/中/右 × 上/下）に linesPerCell ずつ配置
  const cols: readonly Column3[] = ['left', 'center', 'right'];
  const rows: readonly ('top' | 'bottom')[] = ['top', 'bottom'];

  let lineCounter = 1;

  for (const c of cols) {
    const colX1 = c === 'left' ? 0 : c === 'center' ? colWidth : colWidth * 2;
    const colX2 = colX1 + colWidth;

    for (const r of rows) {
      const rowY1 = r === 'top' ? 0 : rowHeight;
      const rowY2 = rowY1 + rowHeight;

      // 区画内での線分配置可能マージン（端点が区画や用紙からはみ出さないよう L/2 + 2mm）
      const pad = Math.max(1, L / 2 + 2);
      const minX = colX1 + pad;
      const maxX = colX2 - pad;
      const minY = rowY1 + pad;
      const maxY = rowY2 - pad;

      const cellLines: CancellationLine[] = [];

      for (let k = 0; k < params.linesPerCell; k++) {
        let placed = false;

        for (let attempt = 0; attempt < 200; attempt++) {
          const cx = ctx.rng.float(minX, maxX);
          const cy = ctx.rng.float(minY, maxY);
          const angle = ctx.rng.float(0, Math.PI);

          const dx = (L / 2) * Math.cos(angle);
          const dy = (L / 2) * Math.sin(angle);
          const x1 = cx - dx;
          const y1 = cy - dy;
          const x2 = cx + dx;
          const y2 = cy + dy;

          // 境界チェック（本文領域内かつ区画内）
          if (
            x1 < 2 ||
            x2 < 2 ||
            x1 > W - 2 ||
            x2 > W - 2 ||
            y1 < 2 ||
            y2 < 2 ||
            y1 > H - 2 ||
            y2 > H - 2
          ) {
            continue;
          }

          // 練習枠との衝突・練習線との距離チェック
          if (practiceBox) {
            // 練習枠の内部および至近には配置しない
            const inPracticeBox =
              cx >= practiceBox.x - 3 &&
              cx <= practiceBox.x + practiceBox.w + 3 &&
              cy >= practiceBox.y - 3 &&
              cy <= practiceBox.y + practiceBox.h + 3;
            if (inPracticeBox) continue;

            const collidesPractice = practiceLines.some(
              (pl) => dist({ x: cx, y: cy }, { x: pl.cx, y: pl.cy }) < minSpacing * 0.9,
            );
            if (collidesPractice) continue;
          }

          // 同じ区画および既存の本課題線分との衝突チェック
          const collidesOthers = allLines.some(
            (al) => dist({ x: cx, y: cy }, { x: al.cx, y: al.cy }) < minSpacing,
          );
          if (collidesOthers) continue;

          const collidesCell = cellLines.some(
            (cl) => dist({ x: cx, y: cy }, { x: cl.cx, y: cl.cy }) < minSpacing,
          );
          if (collidesCell) continue;

          const line: CancellationLine = {
            id: `line-${lineCounter++}`,
            cx,
            cy,
            x1,
            y1,
            x2,
            y2,
            angle,
            length: L,
            isPractice: false,
            col: c,
            row: r,
          };
          cellLines.push(line);
          allLines.push(line);
          statItems.push({ x: cx, y: cy, isTarget: true, isPractice: false });
          placed = true;
          break;
        }

        if (!placed) {
          // どうしても配置できなかった場合の緩和フォールバック
          const cx = minX + (maxX - minX) * ((k + 0.5) / params.linesPerCell);
          const cy = minY + (maxY - minY) * 0.5;
          const angle = ctx.rng.float(0, Math.PI);
          const dx = (L / 2) * Math.cos(angle);
          const dy = (L / 2) * Math.sin(angle);
          const line: CancellationLine = {
            id: `line-${lineCounter++}`,
            cx,
            cy,
            x1: cx - dx,
            y1: cy - dy,
            x2: cx + dx,
            y2: cy + dy,
            angle,
            length: L,
            isPractice: false,
            col: c,
            row: r,
          };
          cellLines.push(line);
          allLines.push(line);
          statItems.push({ x: cx, y: cy, isTarget: true, isPractice: false });
        }
      }
    }
  }

  const entireArea: Rect = { x: 0, y: 0, w: W, h: H };
  const columnStats = computeColumnStats(statItems, entireArea);
  const quadrantStats = computeQuadrantStats(statItems, entireArea);

  return {
    subMode: 'cancellation',
    lines: [...practiceLines, ...allLines],
    practiceBox,
    columnStats,
    quadrantStats,
  };
}

/**
 * サブモードB：線分二等分データ生成
 */
function generateBisectionData(
  ctx: GenerateContext,
  params: M05Params & CommonParams,
): M05Data {
  let minL = params.minLengthMm;
  let maxL = params.maxLengthMm;

  if (minL > maxL) {
    const tmp = minL;
    minL = maxL;
    maxL = tmp;
    ctx.warn('PARAM_CLAMPED', '最小長が最大長より大きいため入れ替えました');
  }

  if (Math.max(params.minLengthMm, params.maxLengthMm) > 170 && params.orientation === 'portrait') {
    ctx.warn('ORIENTATION_FORCED', '線分長が170mmを超えるため横向きに変更しました');
  }

  const W = ctx.body.widthMm;
  const H = ctx.body.heightMm;
  const n = params.bisectCount;
  const topPad = 6;
  const spacing = (H - topPad) / n;

  // 長さ：等間隔 → 5mm 単位に丸め → シャッフル
  const rawLengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const len = n === 1 ? maxL : minL + ((maxL - minL) * i) / (n - 1);
    rawLengths.push(Math.round(len / 5) * 5);
  }
  const lengths = ctx.rng.shuffle(rawLengths);

  // 左右オフセット：符号を半数ずつ（奇数なら1本は0付近）→ シャッフル
  const rawSigns: number[] = [];
  for (let i = 0; i < n; i++) {
    if (n % 2 !== 0 && i === n - 1) {
      rawSigns.push(0);
    } else {
      rawSigns.push(i % 2 === 0 ? 1 : -1);
    }
  }
  const signs = ctx.rng.shuffle(rawSigns);

  const lines: BisectionLine[] = [];
  for (let i = 0; i < n; i++) {
    const y = topPad + (i + 0.5) * spacing;
    const L = lengths[i] ?? minL;
    const sign = signs[i] ?? 0;
    let o =
      sign === 0
        ? ctx.rng.float(-2, 2)
        : sign * ctx.rng.float(0.3, 1.0) * params.maxOffsetMm;

    // 用紙からはみ出さないよう制限（左右 5mm の余白）
    const limit = (W - L) / 2 - 5;
    if (limit > 0) {
      o = Math.max(-limit, Math.min(limit, o));
    } else {
      o = 0;
    }

    const x1 = W / 2 + o - L / 2;
    const x2 = x1 + L;
    const midpoint = x1 + L / 2;

    lines.push({
      id: `line-${i + 1}`,
      index: i + 1,
      y,
      length: L,
      offset: o,
      x1,
      x2,
      midpoint,
    });
  }

  return {
    subMode: 'bisection',
    lines,
  };
}
