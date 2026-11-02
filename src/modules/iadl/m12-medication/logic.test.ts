/**
 * M12 服薬管理・残薬計算 単体テスト
 * ARCHITECTURE.md §5.6, §8, §9 準拠
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, DoseTiming, M12Params } from '../../../types/schema';
import { m12Module } from './index';
import { formatTimingLabels, generateMedicationProblem } from './logic';

const baseParams: M12Params = {
  drugCount: 4,
  labelStyle: 'letterEffect',
  organizer: 'daily',
  includeCalc: true,
  travelDays: '7',
  includeStock: true,
};

const common: CommonParams = {
  textScale: 100,
  strokeScale: 100,
};

describe('M12 Medication & Stock calculation logic', () => {
  it('formats timing labels correctly in Japanese', () => {
    const timings: DoseTiming[] = ['morning', 'evening'];
    expect(formatTimingLabels(timings)).toBe('朝食後・夕食後');
  });

  it('generates valid medication problem satisfying constraints', () => {
    const { ctx } = makeTestContext({ moduleId: 'M12', seed: 101 });
    const problem = generateMedicationProblem(baseParams, ctx);

    expect(problem.drugs.length).toBe(4);
    expect(problem.travelDays).toBe(7);

    // 各薬剤の検証
    for (const d of problem.drugs) {
      expect(d.timings.length).toBeGreaterThanOrEqual(1);
      expect(d.dosePerTime === 1 || d.dosePerTime === 2).toBe(true);
      expect(d.dailyTotal).toBe(d.dosePerTime * d.timings.length);
      expect(d.requiredTotal).toBe(d.dailyTotal * 7);
      expect(d.displayName).toContain(d.letter);
    }

    // 4区分の配薬整合性検証
    const timingsList: DoseTiming[] = ['morning', 'noon', 'evening', 'bedtime'];
    for (const t of timingsList) {
      const scheduled = problem.timingSchedule[t];
      for (const item of scheduled) {
        expect(item.drug.timings).toContain(t);
        expect(item.dose).toBe(item.drug.dosePerTime);
      }
    }
  });

  it('calculates stock shortage and remaining days without fractions or zero division', () => {
    for (const days of ['7', '14'] as const) {
      const { ctx } = makeTestContext({ moduleId: 'M12', seed: 202 });
      const params: M12Params = { ...baseParams, travelDays: days };
      const problem = generateMedicationProblem(params, ctx);

      expect(problem.stockQuestions.length).toBe(2);

      // 設問1: 不足数
      const q1 = problem.stockQuestions[0]!;
      expect(q1.kind).toBe('shortage');
      expect(q1.currentStock).toBeGreaterThanOrEqual(0);
      expect(q1.currentStock).toBeLessThan(q1.targetDrug.requiredTotal);
      expect(q1.currentStock % q1.targetDrug.dailyTotal).toBe(0);
      expect(q1.answerText).toContain('不足');

      // 設問2: 残日数
      const q2 = problem.stockQuestions[1]!;
      expect(q2.kind).toBe('days');
      expect(q2.currentStock).toBeGreaterThan(0);
      expect(q2.currentStock % q2.targetDrug.dailyTotal).toBe(0);
      expect(q2.answerText).toContain('日分');
    }
  });

  it('supports labelStyle variations', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M12', seed: 301 });
    const p1 = generateMedicationProblem({ ...baseParams, labelStyle: 'fictionalEffect' }, ctx1);
    expect(p1.drugs[0]?.displayName).toContain(p1.drugs[0]?.fictionalName);

    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M12', seed: 301 });
    const p2 = generateMedicationProblem({ ...baseParams, labelStyle: 'letterOnly' }, ctx2);
    expect(p2.drugs[0]?.displayName).toBe(`${p2.drugs[0]?.letter}${p2.drugs[0]?.form}`);
  });

  it('is deterministic for same seed', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M12', seed: 404 });
    const p1 = generateMedicationProblem(baseParams, ctx1);

    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M12', seed: 404 });
    const p2 = generateMedicationProblem(baseParams, ctx2);

    expect(p1).toEqual(p2);
  });

  it('generates 2 pages through m12Module.generate', () => {
    const { ctx } = makeTestContext({ moduleId: 'M12', seed: 505 });
    const res = m12Module.generate(ctx, { ...baseParams, ...common });

    expect(res.pages.length).toBe(2);
    expect(res.pages[0]?.pageRole).toBe('problem');
    expect(res.pages[0]?.kind).toBe('html');
    expect(res.pages[0]?.markup).toContain('お薬説明書');
    expect(res.pages[0]?.markup).toContain('設問1：お薬の仕分け');

    expect(res.pages[1]?.pageRole).toBe('answer');
    expect(res.pages[1]?.kind).toBe('html');
    expect(res.pages[1]?.markup).toContain('模範解答');
  });

  it('supports weekly organizer layout', () => {
    const { ctx } = makeTestContext({ moduleId: 'M12', seed: 606 });
    const res = m12Module.generate(ctx, { ...baseParams, organizer: 'weekly', ...common });

    expect(res.pages[0]?.markup).toContain('月');
    expect(res.pages[0]?.markup).toContain('火');
    expect(res.pages[0]?.markup).toContain('日');
  });
});
