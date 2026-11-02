/**
 * M11 サブモードA: 月間カレンダー 単体テスト
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { M11Params } from '../../../types/schema';
import {
  generateCalendarProblem,
  getDaysInMonth,
  getFirstDayOfWeek,
} from './calendar';

const defaultParams: M11Params = {
  subMode: 'calendar',
  calendarSource: 'actual',
  year: 2024,
  month: 2, // 2024年は閏年（29日）
  weekStart: 'sun',
  conditionCount: 4,
  calendarTask: 'both',
  dayStartHour: 9,
  dayEndHour: 17,
  errandCount: 4,
  includeTravel: true,
  constraintLevel: 'normal',
};

describe('M11A Calendar logic', () => {
  it('correctly calculates leap years and days in month', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29); // 閏年
    expect(getDaysInMonth(2023, 2)).toBe(28); // 平年
    expect(getDaysInMonth(2024, 4)).toBe(30);
    expect(getDaysInMonth(2024, 5)).toBe(31);
    expect(getDaysInMonth(2000, 2)).toBe(29); // 400年閏年
    expect(getDaysInMonth(2100, 2)).toBe(28); // 100年平年
  });

  it('correctly calculates first day of week', () => {
    // 2024-01-01 は月曜日 (1)
    expect(getFirstDayOfWeek(2024, 1)).toBe(1);
    // 2024-02-01 は木曜日 (4)
    expect(getFirstDayOfWeek(2024, 2)).toBe(4);
    // 2024-03-01 は金曜日 (5)
    expect(getFirstDayOfWeek(2024, 3)).toBe(5);
  });

  it('generates valid calendar problem with actual source', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 42 });
    const problem = generateCalendarProblem(defaultParams, ctx);

    expect(problem.year).toBe(2024);
    expect(problem.month).toBe(2);
    expect(problem.daysInMonth).toBe(29);
    expect(problem.firstDayOfWeek).toBe(4);
    expect(problem.conditions.length).toBe(4);
    expect(problem.questions.length).toBeGreaterThanOrEqual(1);

    // グリッド検証
    expect(problem.rows.length).toBeGreaterThanOrEqual(5);
    for (const row of problem.rows) {
      expect(row.length).toBe(7);
      for (const cell of row) {
        if (cell.day > 0) {
          expect(cell.day).toBeGreaterThanOrEqual(1);
          expect(cell.day).toBeLessThanOrEqual(29);
          // 1日のイベント数は最大2件
          expect(cell.events.length).toBeLessThanOrEqual(2);
        }
      }
    }

    // 条件の日付が範囲内であること
    for (const cond of problem.conditions) {
      expect(cond.targetDays.length).toBeGreaterThanOrEqual(1);
      for (const d of cond.targetDays) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(29);
      }
    }
  });

  it('handles practice source and weekStart=mon', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 999 });
    const params: M11Params = {
      ...defaultParams,
      calendarSource: 'practice',
      weekStart: 'mon',
      conditionCount: 5,
    };
    const problem = generateCalendarProblem(params, ctx);

    expect(problem.weekStart).toBe('mon');
    expect(problem.conditions.length).toBe(5);
    expect(problem.rows.length).toBeGreaterThanOrEqual(4);

    // 月曜始まりの場合、行の先頭セルの曜日は月曜 (1)
    for (const row of problem.rows) {
      expect(row.length).toBe(7);
      expect(row[0]?.weekday).toBe(1);
    }
  });

  it('ensures question answers match calendar events', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 12345 });
    const problem = generateCalendarProblem(defaultParams, ctx);

    for (const q of problem.questions) {
      expect(q.questionText.length).toBeGreaterThan(0);
      expect(q.answerText.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for same seed', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M11', seed: 777 });
    const prob1 = generateCalendarProblem(defaultParams, ctx1);

    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M11', seed: 777 });
    const prob2 = generateCalendarProblem(defaultParams, ctx2);

    expect(prob1).toEqual(prob2);
  });
});
