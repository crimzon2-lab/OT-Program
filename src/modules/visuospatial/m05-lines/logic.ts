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
 * 点 (px, py) と線分 (x1, y1)-(x2, y2) の最短距離を返す
 */
function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-9) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  const projX = x1 + t * vx;
  const projY = y1 + t * vy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * 2つの線分 AB と CD が交差するかを判定する
 */
function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const orient = (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
  ): number => (p2x - p1x) * (p3y - p1y) - (p2y - p1y) * (p3x - p1x);

  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);

  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) {
    return true;
  }
  return false;
}

/**
 * 2つの線分間の最短距離（mm）を返す（交差する場合は 0）
 */
export function segmentDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
    return 0;
  }
  return Math.min(
    pointToSegmentDist(ax, ay, cx, cy, dx, dy),
    pointToSegmentDist(bx, by, cx, cy, dx, dy),
    pointToSegmentDist(cx, cy, ax, ay, bx, by),
    pointToSegmentDist(dx, dy, ax, ay, bx, by),
  );
}

/**
 * 線分 (x1, y1)-(x2, y2) が指定矩形（余白 margin 拡張後）の内部または境界と交差するか判定
 */
function segmentHitsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: PracticeBox,
  margin: number,
): boolean {
  const rx1 = rect.x - margin;
  const ry1 = rect.y - margin;
  const rx2 = rect.x + rect.w + margin;
  const ry2 = rect.y + rect.h + margin;

  // 端点が矩形内にある場合
  if (
    (x1 >= rx1 && x1 <= rx2 && y1 >= ry1 && y1 <= ry2) ||
    (x2 >= rx1 && x2 <= rx2 && y2 >= ry1 && y2 <= ry2)
  ) {
    return true;
  }

  // 矩形の4辺との交差判定
  return (
    segmentsIntersect(x1, y1, x2, y2, rx1, ry1, rx2, ry1) ||
    segmentsIntersect(x1, y1, x2, y2, rx2, ry1, rx2, ry2) ||
    segmentsIntersect(x1, y1, x2, y2, rx2, ry2, rx1, ry2) ||
    segmentsIntersect(x1, y1, x2, y2, rx1, ry2, rx1, ry1)
  );
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

    // 練習線4本を中央枠内に重ならないよう配置
    const practiceCount = 4;
    const edgePad = 3;
    for (let pIdx = 0; pIdx < practiceCount; pIdx++) {
      // 4本を左右方向に緩やかに分散させつつランダム角度で配置
      const slotW = (practiceBox.w - edgePad * 2) / practiceCount;
      let bestCand: CancellationLine | null = null;
      let bestClearance = -1;

      for (let attempt = 0; attempt < 120; attempt++) {
        const slotX1 = practiceBox.x + edgePad + pIdx * slotW;
        const slotX2 = slotX1 + slotW;
        const cx =
          attempt < 80
            ? ctx.rng.float(slotX1, slotX2)
            : ctx.rng.float(practiceBox.x + edgePad, practiceBox.x + practiceBox.w - edgePad);
        const cy = ctx.rng.float(
          practiceBox.y + edgePad,
          practiceBox.y + practiceBox.h - edgePad,
        );
        const angle = ctx.rng.float(0, Math.PI);
        const dx = (L / 2) * Math.cos(angle);
        const dy = (L / 2) * Math.sin(angle);
        const x1 = cx - dx;
        const y1 = cy - dy;
        const x2 = cx + dx;
        const y2 = cy + dy;

        // 端点が練習枠内に収まっているか
        if (
          x1 < practiceBox.x + 2 ||
          x2 < practiceBox.x + 2 ||
          x1 > practiceBox.x + practiceBox.w - 2 ||
          x2 > practiceBox.x + practiceBox.w - 2 ||
          y1 < practiceBox.y + 2 ||
          y2 < practiceBox.y + 2 ||
          y1 > practiceBox.y + practiceBox.h - 2 ||
          y2 > practiceBox.y + practiceBox.h - 2
        ) {
          continue;
        }

        let minSegD = Infinity;
        let minCenterD = Infinity;
        for (const pl of practiceLines) {
          const sd = segmentDistance(x1, y1, x2, y2, pl.x1, pl.y1, pl.x2, pl.y2);
          const cd = dist({ x: cx, y: cy }, { x: pl.cx, y: pl.cy });
          if (sd < minSegD) minSegD = sd;
          if (cd < minCenterD) minCenterD = cd;
        }

        const cand: CancellationLine = {
          id: `p-${pIdx + 1}`,
          cx,
          cy,
          x1,
          y1,
          x2,
          y2,
          angle,
          length: L,
          isPractice: true,
          col: 'center',
          row: cy < H / 2 ? 'top' : 'bottom',
        };

        if (minSegD >= 3.5 && minCenterD >= Math.min(10, L * 0.45)) {
          bestCand = cand;
          break;
        }
        if (minSegD > bestClearance) {
          bestClearance = minSegD;
          bestCand = cand;
        }
      }

      if (!bestCand) {
        // 枠内に確実に収まる縦寄りの平行配置フォールバック
        const cx = practiceBox.x + ((pIdx + 0.5) / practiceCount) * practiceBox.w;
        const cy = practiceBox.y + practiceBox.h / 2;
        const angle = Math.PI / 2 + ((pIdx % 2 === 0 ? 1 : -1) * Math.PI) / 12;
        const effL = Math.min(L, practiceBox.h - 6);
        const dx = (effL / 2) * Math.cos(angle);
        const dy = (effL / 2) * Math.sin(angle);
        bestCand = {
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
      }

      practiceLines.push(bestCand);
      statItems.push({ x: bestCand.cx, y: bestCand.cy, isTarget: false, isPractice: true });
    }
  }

  // 6区画（左/中/右 × 上/下）の定義
  // 区画間の空白帯が目立たないよう、中点 (cx, cy) は区画境界の 2.5mm 内側まで許容し、
  // 用紙外周のみ端点が [outerPad, W - outerPad] × [outerPad, H - outerPad] に収まるよう制約する。
  const cols: readonly Column3[] = ['left', 'center', 'right'];
  const rows: readonly ('top' | 'bottom')[] = ['top', 'bottom'];

  interface SubSlot {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly baseAngleMin: number;
    readonly baseAngleMax: number;
  }

  interface CellDef {
    readonly col: Column3;
    readonly row: 'top' | 'bottom';
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly slots: readonly SubSlot[];
  }

  const innerBoundaryPad = 2.0;
  const outerEdgePad = 4.0;
  const cells: CellDef[] = [];

  const subCols = params.linesPerCell <= 2 ? 2 : params.linesPerCell <= 4 ? 2 : 3;
  const subRows = params.linesPerCell <= 2 ? 1 : 2;

  for (const c of cols) {
    const colX1 = c === 'left' ? 0 : c === 'center' ? colWidth : colWidth * 2;
    const colX2 = colX1 + colWidth;
    for (const r of rows) {
      const rowY1 = r === 'top' ? 0 : rowHeight;
      const rowY2 = rowY1 + rowHeight;
      const cMinX = c === 'left' ? outerEdgePad + 2 : colX1 + innerBoundaryPad;
      const cMaxX = c === 'right' ? W - outerEdgePad - 2 : colX2 - innerBoundaryPad;
      const cMinY = r === 'top' ? outerEdgePad + 2 : rowY1 + innerBoundaryPad;
      const cMaxY = r === 'bottom' ? H - outerEdgePad - 2 : rowY2 - innerBoundaryPad;

      const subW = (cMaxX - cMinX) / subCols;
      const subH = (cMaxY - cMinY) / subRows;
      const overlapX = subW * 0.22;
      const overlapY = subH * 0.22;

      const rawCoords: { minX: number; maxX: number; minY: number; maxY: number }[] = [];
      for (let sr = 0; sr < subRows; sr++) {
        for (let sc = 0; sc < subCols; sc++) {
          rawCoords.push({
            minX: Math.max(cMinX, cMinX + sc * subW - overlapX),
            maxX: Math.min(cMaxX, cMinX + (sc + 1) * subW + overlapX),
            minY: Math.max(cMinY, cMinY + sr * subH - overlapY),
            maxY: Math.min(cMaxY, cMinY + (sr + 1) * subH + overlapY),
          });
        }
      }
      const shuffledCoords = ctx.rng.shuffle(rawCoords);

      // 角度も均等に分散させてシャッフル（同じ向きの線ばかり固まるのを防ぐ）
      const angleBands = ctx.rng.shuffle(
        Array.from({ length: params.linesPerCell }, (_, idx) => ({
          min: (idx / params.linesPerCell) * Math.PI,
          max: ((idx + 1) / params.linesPerCell) * Math.PI,
        })),
      );

      const slots: SubSlot[] = Array.from({ length: params.linesPerCell }, (_, idx) => {
        const coord = shuffledCoords[idx % shuffledCoords.length]!;
        const band = angleBands[idx]!;
        return {
          minX: coord.minX,
          maxX: coord.maxX,
          minY: coord.minY,
          maxY: coord.maxY,
          baseAngleMin: band.min,
          baseAngleMax: band.max,
        };
      });

      cells.push({
        col: c,
        row: r,
        minX: cMinX,
        maxX: cMaxX,
        minY: cMinY,
        maxY: cMaxY,
        slots,
      });
    }
  }

  let lineCounter = 1;

  // 1巡ごとに6区画へ1本ずつ配置（ラウンドロビン）することで区画境界付近の偏りをなくす
  for (let k = 0; k < params.linesPerCell; k++) {
    const cellOrder = ctx.rng.shuffle(cells);

    for (const cell of cellOrder) {
      const slot = cell.slots[k]!;
      const existingSegments: readonly CancellationLine[] = [
        ...practiceLines,
        ...allLines,
      ];

      // 段階的に緩和するしきい値（ステージ0: サブスロット内で理想的な間隔 → ステージ1: 区画全体で探索 → ステージ2: 交差禁止のみ）
      const stages = [
        {
          useSlot: true,
          minSegGap: Math.max(5.0, L * 0.22),
          minCenterGap: Math.max(14, L * 0.68),
          trials: 80,
          bestOf: 6,
        },
        {
          useSlot: false,
          minSegGap: Math.max(3.8, L * 0.15),
          minCenterGap: Math.max(10, L * 0.5),
          trials: 90,
          bestOf: 5,
        },
        {
          useSlot: false,
          minSegGap: 2.2,
          minCenterGap: Math.max(7, L * 0.35),
          trials: 80,
          bestOf: 2,
        },
      ];

      let chosenLine: CancellationLine | null = null;
      let fallbackBestLine: CancellationLine | null = null;
      let fallbackBestScore = -1;

      for (const stage of stages) {
        let validCandidatesFound = 0;
        let stageBestLine: CancellationLine | null = null;
        let stageBestScore = -1;

        const rangeMinX = stage.useSlot ? slot.minX : cell.minX;
        const rangeMaxX = stage.useSlot ? slot.maxX : cell.maxX;
        const rangeMinY = stage.useSlot ? slot.minY : cell.minY;
        const rangeMaxY = stage.useSlot ? slot.maxY : cell.maxY;

        for (let t = 0; t < stage.trials; t++) {
          const cx = ctx.rng.float(rangeMinX, rangeMaxX);
          const cy = ctx.rng.float(rangeMinY, rangeMaxY);
          const angle = stage.useSlot
            ? ctx.rng.float(slot.baseAngleMin, slot.baseAngleMax)
            : ctx.rng.float(0, Math.PI);

          const dx = (L / 2) * Math.cos(angle);
          const dy = (L / 2) * Math.sin(angle);
          const x1 = cx - dx;
          const y1 = cy - dy;
          const x2 = cx + dx;
          const y2 = cy + dy;

          // 用紙外周からはみ出さないか確認
          if (
            x1 < outerEdgePad ||
            x2 < outerEdgePad ||
            x1 > W - outerEdgePad ||
            x2 > W - outerEdgePad ||
            y1 < outerEdgePad ||
            y2 < outerEdgePad ||
            y1 > H - outerEdgePad ||
            y2 > H - outerEdgePad
          ) {
            continue;
          }

          // 練習枠との交差・接近禁止
          if (practiceBox && segmentHitsRect(x1, y1, x2, y2, practiceBox, 3.0)) {
            continue;
          }

          // 既存線分との最短線分距離および中点距離を計算
          let minSegDist = Infinity;
          let minCenterDist = Infinity;

          for (const ex of existingSegments) {
            const sd = segmentDistance(x1, y1, x2, y2, ex.x1, ex.y1, ex.x2, ex.y2);
            if (sd < minSegDist) minSegDist = sd;
            if (minSegDist < 1.5) break; // 早期打ち切り

            const cd = dist({ x: cx, y: cy }, { x: ex.cx, y: ex.cy });
            if (cd < minCenterDist) minCenterDist = cd;
          }

          const candidate: CancellationLine = {
            id: `line-${lineCounter}`,
            cx,
            cy,
            x1,
            y1,
            x2,
            y2,
            angle,
            length: L,
            isPractice: false,
            col: cell.col,
            row: cell.row,
          };

          // 最も離れている候補をフォールバック用に記録
          const combinedScore = minSegDist * 2 + minCenterDist * 0.5;
          if (combinedScore > fallbackBestScore) {
            fallbackBestScore = combinedScore;
            fallbackBestLine = candidate;
          }

          if (minSegDist >= stage.minSegGap && minCenterDist >= stage.minCenterGap) {
            validCandidatesFound++;
            // Best-Candidate 法：既存の線分から適度に離れた場所を優先してバラけさせる
            const jitteredScore = (minCenterDist + minSegDist) * ctx.rng.float(0.8, 1.0);
            if (jitteredScore > stageBestScore) {
              stageBestScore = jitteredScore;
              stageBestLine = candidate;
            }
            if (validCandidatesFound >= stage.bestOf) {
              break;
            }
          }
        }

        if (stageBestLine) {
          chosenLine = stageBestLine;
          break;
        }
      }

      if (!chosenLine) {
        if (fallbackBestLine) {
          chosenLine = fallbackBestLine;
        } else {
          // 最終安全フォールバック
          const cx = cell.minX + (cell.maxX - cell.minX) * ((k + 0.5) / params.linesPerCell);
          const cy = cell.minY + (cell.maxY - cell.minY) * 0.5;
          const angle = Math.PI / 2;
          const dx = (L / 2) * Math.cos(angle);
          const dy = (L / 2) * Math.sin(angle);
          chosenLine = {
            id: `line-${lineCounter}`,
            cx,
            cy,
            x1: cx - dx,
            y1: cy - dy,
            x2: cx + dx,
            y2: cy + dy,
            angle,
            length: L,
            isPractice: false,
            col: cell.col,
            row: cell.row,
          };
        }
      }

      lineCounter++;
      allLines.push(chosenLine);
      statItems.push({
        x: chosenLine.cx,
        y: chosenLine.cy,
        isTarget: true,
        isPractice: false,
      });
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
