/**
 * 幾何計算・象限/3列集計ユーティリティ
 * ARCHITECTURE.md §5.1, §6 準拠
 */

import type { Column3, ColumnStats, Quadrant, QuadrantStats } from '../types/schema';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface StatItem extends Point {
  readonly isTarget: boolean;
  readonly isPractice?: boolean;
}

/**
 * 2点間のユークリッド距離を計算する
 */
export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 指定した領域内における点の象限を判定する。
 * p.x < area.x + area.w / 2 なら左、それ以外（中線上含む）は右。
 * p.y < area.y + area.h / 2 なら上、それ以外（中線上含む）は下。
 */
export function quadrantOf(p: Point, area: Rect): Quadrant {
  const midX = area.x + area.w / 2;
  const midY = area.y + area.h / 2;
  const isLeft = p.x < midX;
  const isTop = p.y < midY;

  if (isLeft && isTop) return 'topLeft';
  if (!isLeft && isTop) return 'topRight';
  if (isLeft && !isTop) return 'bottomLeft';
  return 'bottomRight';
}

/**
 * 指定した領域を横3等分し、点がどの列に属するかを判定する。
 * p.x < area.x + area.w / 3 なら left、
 * p.x < area.x + (area.w / 3) * 2 なら center、
 * それ以外（中線上含む）は right。
 */
export function column3Of(p: Point, area: Rect): Column3 {
  const colW = area.w / 3;
  if (p.x < area.x + colW) {
    return 'left';
  }
  if (p.x < area.x + colW * 2) {
    return 'center';
  }
  return 'right';
}

/**
 * 領域を4等分した象限ごとの Rect を返す
 */
export function splitQuadrants(area: Rect): Readonly<Record<Quadrant, Rect>> {
  const qw = area.w / 2;
  const qh = area.h / 2;

  return {
    topLeft: { x: area.x, y: area.y, w: qw, h: qh },
    topRight: { x: area.x + qw, y: area.y, w: qw, h: qh },
    bottomLeft: { x: area.x, y: area.y + qh, w: qw, h: qh },
    bottomRight: { x: area.x + qw, y: area.y + qh, w: qw, h: qh },
  };
}

/**
 * アイテム一覧から各象限の正解数・総刺激数を集計する（練習用要素は除外）
 */
export function computeQuadrantStats(
  items: readonly StatItem[],
  area: Rect,
): QuadrantStats {
  let tlTargets = 0;
  let tlTotal = 0;
  let trTargets = 0;
  let trTotal = 0;
  let blTargets = 0;
  let blTotal = 0;
  let brTargets = 0;
  let brTotal = 0;

  for (const item of items) {
    if (item.isPractice) continue;
    const q = quadrantOf(item, area);
    switch (q) {
      case 'topLeft':
        tlTotal++;
        if (item.isTarget) tlTargets++;
        break;
      case 'topRight':
        trTotal++;
        if (item.isTarget) trTargets++;
        break;
      case 'bottomLeft':
        blTotal++;
        if (item.isTarget) blTargets++;
        break;
      case 'bottomRight':
        brTotal++;
        if (item.isTarget) brTargets++;
        break;
    }
  }

  return {
    topLeft: { targets: tlTargets, total: tlTotal },
    topRight: { targets: trTargets, total: trTotal },
    bottomLeft: { targets: blTargets, total: blTotal },
    bottomRight: { targets: brTargets, total: brTotal },
  };
}

/**
 * アイテム一覧から横3列の正解数・総刺激数を集計する（練習用要素は除外）
 */
export function computeColumnStats(
  items: readonly StatItem[],
  area: Rect,
): ColumnStats {
  let lTargets = 0;
  let lTotal = 0;
  let cTargets = 0;
  let cTotal = 0;
  let rTargets = 0;
  let rTotal = 0;

  for (const item of items) {
    if (item.isPractice) continue;
    const col = column3Of(item, area);
    switch (col) {
      case 'left':
        lTotal++;
        if (item.isTarget) lTargets++;
        break;
      case 'center':
        cTotal++;
        if (item.isTarget) cTargets++;
        break;
      case 'right':
        rTotal++;
        if (item.isTarget) rTargets++;
        break;
    }
  }

  return {
    left: { targets: lTargets, total: lTotal },
    center: { targets: cTargets, total: cTotal },
    right: { targets: rTargets, total: rTotal },
  };
}
