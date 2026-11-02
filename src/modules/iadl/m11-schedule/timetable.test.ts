/**
 * M11 サブモードB: 逆算タイムスケジュール生成＆ソルバ 単体テスト
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { M11Params } from '../../../types/schema';
import { formatMinute, verifyPlan, type PlannedItem } from './solver';
import { generateTimetableProblem } from './timetable';

const baseParams: M11Params = {
  subMode: 'timetable',
  calendarSource: 'practice',
  year: 2027,
  month: 4,
  weekStart: 'sun',
  conditionCount: 4,
  calendarTask: 'both',
  dayStartHour: 9,
  dayEndHour: 17,
  errandCount: 4,
  includeTravel: true,
  constraintLevel: 'normal',
};

describe('M11B Timetable & Solver logic', () => {
  it('formats minute correctly', () => {
    expect(formatMinute(540)).toBe('9:00');
    expect(formatMinute(570)).toBe('9:30');
    expect(formatMinute(750)).toBe('12:30');
    expect(formatMinute(1020)).toBe('17:00');
  });

  it('generates valid timetable problem where solution satisfies all constraints', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 100 });
    const problem = generateTimetableProblem(baseParams, ctx);

    expect(problem.errands.length).toBe(4);
    expect(problem.solution.length).toBe(4);
    expect(problem.constraints.length).toBeGreaterThanOrEqual(1);

    // ソルバで全検証が合格すること
    const results = verifyPlan(problem, problem.solution);
    expect(results.length).toBeGreaterThanOrEqual(5);
    for (const r of results) {
      expect(r.ok, `Constraint ${r.constraintId} (${r.label}) should be true`).toBe(true);
    }
  });

  it('generates problems across various constraint levels (easy, normal, hard)', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const { ctx } = makeTestContext({ moduleId: 'M11', seed: 200 });
      const params: M11Params = { ...baseParams, constraintLevel: level };
      const problem = generateTimetableProblem(params, ctx);

      const results = verifyPlan(problem, problem.solution);
      expect(results.every((r) => r.ok)).toBe(true);
    }
  });

  it('handles includeTravel=false properly', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 300 });
    const params: M11Params = { ...baseParams, includeTravel: false };
    const problem = generateTimetableProblem(params, ctx);

    expect(problem.includeTravel).toBe(false);
    const results = verifyPlan(problem, problem.solution);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('detects violations when an invalid plan is evaluated by verifyPlan', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 400 });
    const problem = generateTimetableProblem(baseParams, ctx);

    // 1. 重複がある場合
    const firstSol = problem.solution[0]!;
    const overlappingPlan: PlannedItem[] = problem.solution.map((item, idx) => {
      if (idx === 1) {
        // 前のアイテムと時間を完全に重ねる
        return { ...item, start: firstSol.start, end: firstSol.end };
      }
      return item;
    });
    const overlapRes = verifyPlan(problem, overlappingPlan);
    const overlapCheck = overlapRes.find((r) => r.constraintId === 'gen-no-overlap');
    expect(overlapCheck?.ok).toBe(false);

    // 2. 時間外の場合
    const outOfBoundsPlan: PlannedItem[] = problem.solution.map((item, idx) => {
      if (idx === 0) {
        return { ...item, start: problem.dayStart - 60, end: problem.dayStart - 30 };
      }
      return item;
    });
    const outOfBoundsRes = verifyPlan(problem, outOfBoundsPlan);
    const timeRangeCheck = outOfBoundsRes.find((r) => r.constraintId === 'gen-time-range');
    expect(timeRangeCheck?.ok).toBe(false);

    // 3. 用事が欠けている場合
    const incompletePlan = problem.solution.slice(0, 2);
    const incompleteRes = verifyPlan(problem, incompletePlan);
    const allErrandsCheck = incompleteRes.find((r) => r.constraintId === 'gen-all-errands');
    expect(allErrandsCheck?.ok).toBe(false);
  });

  it('is deterministic for same seed', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M11', seed: 555 });
    const p1 = generateTimetableProblem(baseParams, ctx1);

    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M11', seed: 555 });
    const p2 = generateTimetableProblem(baseParams, ctx2);

    expect(p1).toEqual(p2);
  });
});
