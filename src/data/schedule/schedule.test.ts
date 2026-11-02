/**
 * スケジュール・カレンダー マスターデータ整合性テスト
 * ARCHITECTURE.md §9.6, §10, DATA_MINIMUMS 準拠
 */

import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS } from '../../types/schema';
import { CALENDAR_EVENT_TEMPLATES } from './calendar-events';
import { ERRAND_TEMPLATES, ORDER_PAIR_TEMPLATES } from './errands';

describe('src/data/schedule master data integrity', () => {
  describe('ERRAND_TEMPLATES', () => {
    it('has at least DATA_MINIMUMS.errands items', () => {
      expect(ERRAND_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.errands);
    });

    it('has required distribution of errand kinds', () => {
      const errandCount = ERRAND_TEMPLATES.filter((e) => e.kind === 'errand').length;
      const mealCount = ERRAND_TEMPLATES.filter((e) => e.kind === 'meal').length;
      const appointmentCount = ERRAND_TEMPLATES.filter((e) => e.kind === 'appointment').length;

      expect(errandCount).toBeGreaterThanOrEqual(24);
      expect(mealCount).toBeGreaterThanOrEqual(2);
      expect(appointmentCount).toBeGreaterThanOrEqual(4);
    });

    it('has unique IDs', () => {
      const ids = new Set(ERRAND_TEMPLATES.map((e) => e.id));
      expect(ids.size).toBe(ERRAND_TEMPLATES.length);
    });

    it('all times and durations are multiples of 30', () => {
      for (const e of ERRAND_TEMPLATES) {
        expect(e.openFromMin % 30).toBe(0);
        expect(e.openToMin % 30).toBe(0);
        expect(e.openFromMin).toBeLessThan(e.openToMin);
        expect(e.durationsMin.length).toBeGreaterThanOrEqual(1);
        for (const d of e.durationsMin) {
          expect(d % 30).toBe(0);
          expect(d).toBeGreaterThanOrEqual(30);
          expect(e.openFromMin + d).toBeLessThanOrEqual(e.openToMin);
        }
        expect(e.travelMin === 0 || e.travelMin === 30).toBe(true);
      }
    });
  });

  describe('ORDER_PAIR_TEMPLATES', () => {
    it('has at least DATA_MINIMUMS.orderPairs items', () => {
      expect(ORDER_PAIR_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.orderPairs);
    });

    it('has unique IDs', () => {
      const ids = new Set(ORDER_PAIR_TEMPLATES.map((op) => op.id));
      expect(ids.size).toBe(ORDER_PAIR_TEMPLATES.length);
    });

    it('all beforeId and afterId exist in ERRAND_TEMPLATES and are temporally feasible', () => {
      const errandMap = new Map(ERRAND_TEMPLATES.map((e) => [e.id, e]));

      for (const op of ORDER_PAIR_TEMPLATES) {
        const before = errandMap.get(op.beforeId);
        const after = errandMap.get(op.afterId);

        expect(before, `beforeId ${op.beforeId} exists`).toBeDefined();
        expect(after, `afterId ${op.afterId} exists`).toBeDefined();

        if (before && after) {
          const minBeforeDur = Math.min(...before.durationsMin);
          const minAfterDur = Math.min(...after.durationsMin);
          // before.openFromMin + min(before.durationsMin) <= after.openToMin - min(after.durationsMin)
          expect(before.openFromMin + minBeforeDur).toBeLessThanOrEqual(
            after.openToMin - minAfterDur
          );
        }
      }
    });
  });

  describe('CALENDAR_EVENT_TEMPLATES', () => {
    it('has at least DATA_MINIMUMS.calendarEvents items', () => {
      expect(CALENDAR_EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.calendarEvents);
    });

    it('has unique IDs', () => {
      const ids = new Set(CALENDAR_EVENT_TEMPLATES.map((ce) => ce.id));
      expect(ids.size).toBe(CALENDAR_EVENT_TEMPLATES.length);
    });

    it('all shortLabels are at most 4 characters', () => {
      for (const ce of CALENDAR_EVENT_TEMPLATES) {
        expect(Array.from(ce.shortLabel).length).toBeLessThanOrEqual(4);
        expect(ce.kinds.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
