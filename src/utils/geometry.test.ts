import { describe, expect, it } from 'vitest';
import {
  column3Of,
  computeColumnStats,
  computeQuadrantStats,
  dist,
  quadrantOf,
  splitQuadrants,
  type Rect,
  type StatItem,
} from './geometry';

describe('src/utils/geometry.ts', () => {
  const testArea: Rect = { x: 10, y: 20, w: 100, h: 80 };
  // midX = 60, midY = 60

  it('dist computes euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(dist({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });

  describe('quadrantOf', () => {
    it('determines quadrants correctly for interior points', () => {
      expect(quadrantOf({ x: 50, y: 50 }, testArea)).toBe('topLeft');
      expect(quadrantOf({ x: 70, y: 50 }, testArea)).toBe('topRight');
      expect(quadrantOf({ x: 50, y: 70 }, testArea)).toBe('bottomLeft');
      expect(quadrantOf({ x: 70, y: 70 }, testArea)).toBe('bottomRight');
    });

    it('assigns midline points to right / bottom', () => {
      // Exactly on midX = 60
      expect(quadrantOf({ x: 60, y: 50 }, testArea)).toBe('topRight');
      // Exactly on midY = 60
      expect(quadrantOf({ x: 50, y: 60 }, testArea)).toBe('bottomLeft');
      // Exactly on center (60, 60)
      expect(quadrantOf({ x: 60, y: 60 }, testArea)).toBe('bottomRight');
    });
  });

  describe('column3Of', () => {
    it('determines 3 columns correctly', () => {
      // colW = 100 / 3 ≈ 33.333 -> col boundaries at x = 10 + 33.333 = 43.333, x = 10 + 66.667 = 76.667
      expect(column3Of({ x: 30, y: 50 }, testArea)).toBe('left');
      expect(column3Of({ x: 50, y: 50 }, testArea)).toBe('center');
      expect(column3Of({ x: 90, y: 50 }, testArea)).toBe('right');
    });

    it('assigns column boundaries to center / right', () => {
      const area: Rect = { x: 0, y: 0, w: 30, h: 30 };
      // col boundaries at 10, 20
      expect(column3Of({ x: 9.9, y: 0 }, area)).toBe('left');
      expect(column3Of({ x: 10, y: 0 }, area)).toBe('center');
      expect(column3Of({ x: 19.9, y: 0 }, area)).toBe('center');
      expect(column3Of({ x: 20, y: 0 }, area)).toBe('right');
    });
  });

  describe('splitQuadrants', () => {
    it('splits area into 4 equal quadrants', () => {
      const quads = splitQuadrants(testArea);
      expect(quads.topLeft).toEqual({ x: 10, y: 20, w: 50, h: 40 });
      expect(quads.topRight).toEqual({ x: 60, y: 20, w: 50, h: 40 });
      expect(quads.bottomLeft).toEqual({ x: 10, y: 60, w: 50, h: 40 });
      expect(quads.bottomRight).toEqual({ x: 60, y: 60, w: 50, h: 40 });
    });
  });

  describe('computeQuadrantStats', () => {
    it('aggregates targets and totals, excluding practice items', () => {
      const items: StatItem[] = [
        { x: 30, y: 30, isTarget: true }, // TL target
        { x: 40, y: 40, isTarget: false }, // TL distractor
        { x: 35, y: 35, isTarget: true, isPractice: true }, // TL practice (excluded)
        { x: 80, y: 30, isTarget: true }, // TR target
        { x: 30, y: 80, isTarget: false }, // BL distractor
        { x: 80, y: 80, isTarget: true }, // BR target
        { x: 90, y: 90, isTarget: true }, // BR target
      ];

      const stats = computeQuadrantStats(items, testArea);
      expect(stats.topLeft).toEqual({ targets: 1, total: 2 });
      expect(stats.topRight).toEqual({ targets: 1, total: 1 });
      expect(stats.bottomLeft).toEqual({ targets: 0, total: 1 });
      expect(stats.bottomRight).toEqual({ targets: 2, total: 2 });
    });
  });

  describe('computeColumnStats', () => {
    it('aggregates columns, excluding practice items', () => {
      const area: Rect = { x: 0, y: 0, w: 30, h: 30 };
      const items: StatItem[] = [
        { x: 5, y: 10, isTarget: true }, // left target
        { x: 8, y: 10, isTarget: false }, // left distractor
        { x: 6, y: 10, isTarget: true, isPractice: true }, // left practice (excluded)
        { x: 15, y: 10, isTarget: true }, // center target
        { x: 25, y: 10, isTarget: false }, // right distractor
      ];

      const stats = computeColumnStats(items, area);
      expect(stats.left).toEqual({ targets: 1, total: 2 });
      expect(stats.center).toEqual({ targets: 1, total: 1 });
      expect(stats.right).toEqual({ targets: 0, total: 1 });
    });
  });
});
