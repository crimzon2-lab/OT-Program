import { describe, expect, it } from 'vitest';
import { createSheetRng } from './prng';
import type { Rect } from './geometry';
import {
  gridLayout,
  PLACEMENT_HARD_CAP,
  placeStratified,
  placeUniform,
} from './placement';

describe('src/utils/placement.ts', () => {
  const rng = createSheetRng(12345, 'M01', 1);
  const testArea: Rect = { x: 0, y: 0, w: 186, h: 237 };

  describe('placeStratified', () => {
    it('guarantees equal counts across all 4 quadrants', () => {
      const perQuad = 10;
      const diameter = 6;
      const gap = 3;
      const res = placeStratified(rng, testArea, perQuad, diameter, gap);

      expect(res.perQuadrant).toBe(perQuad);
      expect(res.points.length).toBe(perQuad * 4);
      expect(res.truncated).toBe(false);

      const counts = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      };
      for (const p of res.points) {
        counts[p.quadrant]++;
      }
      expect(counts.topLeft).toBe(perQuad);
      expect(counts.topRight).toBe(perQuad);
      expect(counts.bottomLeft).toBe(perQuad);
      expect(counts.bottomRight).toBe(perQuad);
    });

    it('satisfies min distance between any two points', () => {
      const diameter = 5;
      const gap = 2;
      const minDist = diameter + gap;
      const res = placeStratified(rng, testArea, 8, diameter, gap);

      for (let i = 0; i < res.points.length; i++) {
        for (let j = i + 1; j < res.points.length; j++) {
          const d = Math.hypot(
            res.points[i]!.x - res.points[j]!.x,
            res.points[i]!.y - res.points[j]!.y,
          );
          expect(d).toBeGreaterThanOrEqual(minDist - 0.0001);
        }
      }
    });

    it('safely truncates when packed density is exceeded and stays within budget', () => {
      // Overcrowded: 100 items per quadrant with large diameter
      const smallArea: Rect = { x: 0, y: 0, w: 40, h: 40 };
      const res = placeStratified(rng, smallArea, 50, 10, 2);

      expect(res.truncated).toBe(true);
      expect(res.attempts).toBeLessThanOrEqual(PLACEMENT_HARD_CAP);
      // Even if truncated, all quadrants must have identical count
      const counts = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      };
      for (const p of res.points) {
        counts[p.quadrant]++;
      }
      expect(counts.topLeft).toBe(res.perQuadrant);
      expect(counts.topRight).toBe(res.perQuadrant);
      expect(counts.bottomLeft).toBe(res.perQuadrant);
      expect(counts.bottomRight).toBe(res.perQuadrant);
    });

    it('handles boundary condition when item is larger than quadrant', () => {
      // Quadrant width is 10, item diameter is 15 -> qw <= 2 * r
      const tinyArea: Rect = { x: 0, y: 0, w: 20, h: 20 };
      const res = placeStratified(rng, tinyArea, 5, 15, 1);
      expect(res.points).toEqual([]);
      expect(res.perQuadrant).toBe(0);
      expect(res.truncated).toBe(true);
      expect(res.attempts).toBe(0);
    });
  });

  describe('placeUniform', () => {
    it('places required number of points satisfying min distance', () => {
      const count = 15;
      const diameter = 8;
      const gap = 4;
      const minDist = diameter + gap;
      const res = placeUniform(rng, testArea, count, diameter, gap);

      expect(res.points.length).toBe(count);
      expect(res.truncated).toBe(false);

      for (let i = 0; i < res.points.length; i++) {
        for (let j = i + 1; j < res.points.length; j++) {
          const d = Math.hypot(
            res.points[i]!.x - res.points[j]!.x,
            res.points[i]!.y - res.points[j]!.y,
          );
          expect(d).toBeGreaterThanOrEqual(minDist - 0.0001);
        }
      }
    });

    it('respects existing points (e.g. TMT start/end nodes)', () => {
      const existing = [
        { x: 50, y: 50, r: 8 },
        { x: 120, y: 150 },
      ];
      const diameter = 6;
      const gap = 2;
      const r = diameter / 2;
      const res = placeUniform(rng, testArea, 10, diameter, gap, existing);

      expect(res.points.length).toBe(10);
      for (const p of res.points) {
        const d0 = Math.hypot(p.x - existing[0]!.x, p.y - existing[0]!.y);
        expect(d0).toBeGreaterThanOrEqual(r + existing[0]!.r! + gap - 0.0001);

        const d1 = Math.hypot(p.x - existing[1]!.x, p.y - existing[1]!.y);
        expect(d1).toBeGreaterThanOrEqual(diameter + gap - 0.0001);
      }
    });

    it('handles boundary conditions when area is too small for item', () => {
      const tinyArea: Rect = { x: 0, y: 0, w: 10, h: 10 };
      const res = placeUniform(rng, tinyArea, 5, 12, 1);
      expect(res.points).toEqual([]);
      expect(res.truncated).toBe(true);
      expect(res.attempts).toBe(0);
    });
  });

  describe('gridLayout', () => {
    it('balances quadrants with even rows and cols when balance is true', () => {
      const res = gridLayout(testArea, 24, 15, true);
      expect(res.rows % 2).toBe(0);
      expect(res.cols % 2).toBe(0);
      expect(res.points.length).toBe(res.rows * res.cols);

      // Verify each quadrant has equal number of points
      const counts = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      };
      for (const p of res.points) {
        counts[p.quadrant]++;
      }
      expect(counts.topLeft).toBe(counts.topRight);
      expect(counts.topLeft).toBe(counts.bottomLeft);
      expect(counts.topLeft).toBe(counts.bottomRight);
    });

    it('selects exact total when possible', () => {
      // 100x100 area with cellMin 10, total 16
      const squareArea: Rect = { x: 0, y: 0, w: 100, h: 100 };
      const res = gridLayout(squareArea, 16, 10, true);
      expect(res.points.length).toBe(16);
      expect(res.rows).toBe(4);
      expect(res.cols).toBe(4);
      expect(res.rounded).toBe(false);
    });

    it('marks rounded as true when total cannot be matched exactly', () => {
      const squareArea: Rect = { x: 0, y: 0, w: 100, h: 100 };
      const res = gridLayout(squareArea, 17, 10, true);
      expect(res.rounded).toBe(true);
      expect(res.rows % 2).toBe(0);
      expect(res.cols % 2).toBe(0);
    });

    it('returns empty when cellMin is larger than area', () => {
      const smallArea: Rect = { x: 0, y: 0, w: 10, h: 10 };
      const res = gridLayout(smallArea, 10, 20, false);
      expect(res.points).toEqual([]);
      expect(res.rows).toBe(0);
      expect(res.cols).toBe(0);
      expect(res.rounded).toBe(true);
    });
  });
});
