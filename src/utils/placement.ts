/**
 * 4象限層化サンプリング・最小距離配置・グリッド配置アルゴリズム
 * ARCHITECTURE.md §5.1 準拠
 */

import { QUADRANT_ORDER, type Quadrant } from '../types/schema';
import { quadrantOf, splitQuadrants, type Point, type Rect } from './geometry';
import type { Rng } from './prng';

export interface Placed extends Point {
  readonly quadrant: Quadrant;
}

export interface StratifiedResult {
  readonly points: readonly Placed[];
  readonly perQuadrant: number;
  readonly truncated: boolean;
  readonly attempts: number;
}

export interface UniformResult {
  readonly points: readonly Placed[];
  readonly truncated: boolean;
  readonly attempts: number;
}

export interface ExistingPoint extends Point {
  readonly r?: number;
}

export interface GridResult {
  readonly points: readonly Placed[];
  readonly rows: number;
  readonly cols: number;
  readonly rounded: boolean;
}

export const PLACEMENT_BASE_ATTEMPTS = 2000;
export const PLACEMENT_ATTEMPTS_PER_ITEM = 20;
export const PLACEMENT_HARD_CAP = 20000;
export const PLACEMENT_PER_ITEM_CAP = 30;
export const PACKING_DENSITY_LIMIT = 0.55;

/**
 * 4象限層化サンプリング（ARCHITECTURE.md §5.1(a)）
 * 領域を4象限に等分し、各象限に同数（perQuadrant 個）の点を最小距離を保って配置する。
 * 打ち切り時は「象限均等」を優先して最小象限数に切り詰める（4象限同数の絶対保証）。
 */
export function placeStratified(
  rng: Rng,
  area: Rect,
  perQuadrant: number,
  itemDiameter: number,
  minGap: number,
): StratifiedResult {
  const r = itemDiameter / 2;
  const minDist = itemDiameter + minGap;
  const quads = splitQuadrants(area);
  const qw = area.w / 2;
  const qh = area.h / 2;

  // 境界ガード: 象限内に収まらない場合や不正値の場合は安全に 0 件で打ち切る
  if (
    perQuadrant <= 0 ||
    itemDiameter <= 0 ||
    minDist <= 0 ||
    qw <= 2 * r ||
    qh <= 2 * r
  ) {
    return {
      points: [],
      perQuadrant: 0,
      truncated: perQuadrant > 0,
      attempts: 0,
    };
  }

  // 1) 事前容量チェック（円充填上限から最大可能数を計算）
  const circleArea = (Math.PI / 4) * (minDist * minDist);
  const capPerQuad = Math.floor((qw * qh * PACKING_DENSITY_LIMIT) / circleArea);
  const target = Math.min(perQuadrant, Math.max(0, capPerQuad));
  let truncated = target < perQuadrant;

  if (target <= 0) {
    return {
      points: [],
      perQuadrant: 0,
      truncated: true,
      attempts: 0,
    };
  }

  // 2) ラウンドロビン配置
  const budget = Math.min(
    PLACEMENT_HARD_CAP,
    PLACEMENT_BASE_ATTEMPTS + 4 * target * PLACEMENT_ATTEMPTS_PER_ITEM,
  );
  let attempts = 0;
  const placed: Placed[][] = [[], [], [], []];
  const allPoints: Placed[] = [];

  while (attempts < budget && placed.some((list) => list.length < target)) {
    let progress = false;
    for (let q = 0; q < 4; q++) {
      const quadList = placed[q]!;
      if (quadList.length >= target) continue;
      const quadName = QUADRANT_ORDER[q]!;
      const quadRect = quads[quadName];

      for (let k = 0; k < PLACEMENT_PER_ITEM_CAP; k++) {
        if (attempts >= budget) break;
        attempts++;
        const x = rng.float(quadRect.x + r, quadRect.x + quadRect.w - r);
        const y = rng.float(quadRect.y + r, quadRect.y + quadRect.h - r);
        if (allPoints.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist)) {
          const item: Placed = { x, y, quadrant: quadName };
          quadList.push(item);
          allPoints.push(item);
          progress = true;
          break;
        }
      }
    }
    if (!progress) break;
  }

  // 3) 打ち切り時は「象限均等」を優先して最小象限数に揃える
  const m = Math.min(
    placed[0]!.length,
    placed[1]!.length,
    placed[2]!.length,
    placed[3]!.length,
  );
  if (m < perQuadrant) {
    truncated = true;
  }

  const resultPoints: Placed[] = [];
  for (let q = 0; q < 4; q++) {
    resultPoints.push(...placed[q]!.slice(0, m));
  }

  return {
    points: resultPoints,
    perQuadrant: m,
    truncated,
    attempts,
  };
}

/**
 * 領域全体での均一サンプリング（ARCHITECTURE.md §5.1(b)）
 * 既存点 existing が渡された場合はその点との衝突距離（半径指定があれば考慮）も保つ。
 */
export function placeUniform(
  rng: Rng,
  area: Rect,
  count: number,
  itemDiameter: number,
  minGap: number,
  existing?: readonly ExistingPoint[],
): UniformResult {
  const r = itemDiameter / 2;
  const minDist = itemDiameter + minGap;

  // 境界ガード
  if (count <= 0 || itemDiameter <= 0 || minDist <= 0 || area.w <= 2 * r || area.h <= 2 * r) {
    return {
      points: [],
      truncated: count > 0,
      attempts: 0,
    };
  }

  const budget = Math.min(
    PLACEMENT_HARD_CAP,
    PLACEMENT_BASE_ATTEMPTS + count * PLACEMENT_ATTEMPTS_PER_ITEM,
  );
  let attempts = 0;
  const points: Placed[] = [];

  while (attempts < budget && points.length < count) {
    let progress = false;
    for (let k = 0; k < PLACEMENT_PER_ITEM_CAP; k++) {
      if (attempts >= budget) break;
      attempts++;
      const x = rng.float(area.x + r, area.x + area.w - r);
      const y = rng.float(area.y + r, area.y + area.h - r);

      const okWithNew = points.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist);
      if (!okWithNew) continue;

      const okWithExisting =
        !existing ||
        existing.every((e) => {
          const requiredDist = (e.r !== undefined ? r + e.r : itemDiameter) + minGap;
          return Math.hypot(e.x - x, e.y - y) >= requiredDist;
        });

      if (okWithExisting) {
        points.push({ x, y, quadrant: quadrantOf({ x, y }, area) });
        progress = true;
        break;
      }
    }
    if (!progress) break;
  }

  return {
    points,
    truncated: points.length < count,
    attempts,
  };
}

/**
 * グリッド配置（ARCHITECTURE.md §5.1(c)）
 * balance=true のときは rows, cols とも偶数に限定し、4象限に同数のセルを配分する。
 */
export function gridLayout(
  area: Rect,
  total: number,
  cellMin: number,
  balance: boolean,
): GridResult {
  if (cellMin <= 0 || area.w < cellMin || area.h < cellMin || total <= 0) {
    return { points: [], rows: 0, cols: 0, rounded: total > 0 };
  }

  const maxCols = Math.floor(area.w / cellMin);
  const maxRows = Math.floor(area.h / cellMin);

  const minC = balance ? 2 : 1;
  const minR = balance ? 2 : 1;
  const step = balance ? 2 : 1;

  if (maxCols < minC || maxRows < minR) {
    return { points: [], rows: 0, cols: 0, rounded: true };
  }

  const areaAspect = area.w / area.h;

  interface GridCandidate {
    cols: number;
    rows: number;
    count: number;
    aspectDiff: number;
  }

  const candidates: GridCandidate[] = [];
  for (let c = minC; c <= maxCols; c += step) {
    for (let r = minR; r <= maxRows; r += step) {
      candidates.push({
        cols: c,
        rows: r,
        count: c * r,
        aspectDiff: Math.abs(c / r - areaAspect),
      });
    }
  }

  // 1) cols * rows === total を優先
  const exact = candidates.filter((cand) => cand.count === total);
  let best: GridCandidate | undefined;
  let rounded = false;

  if (exact.length > 0) {
    exact.sort((a, b) => a.aspectDiff - b.aspectDiff);
    best = exact[0];
    rounded = false;
  } else {
    // 2) cols * rows <= total のうち count 最大を優先
    const under = candidates.filter((cand) => cand.count <= total);
    if (under.length > 0) {
      under.sort((a, b) => b.count - a.count || a.aspectDiff - b.aspectDiff);
      best = under[0];
      rounded = true;
    } else {
      // 3) total を下回るものがない場合は最小 count の候補を採用
      candidates.sort((a, b) => a.count - b.count || a.aspectDiff - b.aspectDiff);
      best = candidates[0];
      rounded = true;
    }
  }

  if (!best) {
    return { points: [], rows: 0, cols: 0, rounded: true };
  }

  const { cols, rows } = best;
  const points: Placed[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = area.x + (c + 0.5) * (area.w / cols);
      const y = area.y + (r + 0.5) * (area.h / rows);
      points.push({ x, y, quadrant: quadrantOf({ x, y }, area) });
    }
  }

  return { points, rows, cols, rounded };
}
