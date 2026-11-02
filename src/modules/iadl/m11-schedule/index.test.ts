/**
 * M11 スケジュール・カレンダー モジュール統合テスト
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M11Params } from '../../../types/schema';
import { m11Module } from './index';

const common: CommonParams = {
  textScale: 100,
  strokeScale: 100,
};

describe('M11 Module Definition & Generation', () => {
  it('has correct module metadata', () => {
    expect(m11Module.id).toBe('M11');
    expect(m11Module.domain).toBe('iadl');
    expect(m11Module.orientation(m11Module.paramSchema as any)).toBe('portrait');
    expect(m11Module.paramSchema.length).toBe(12);
  });

  it('generates 2 pages (problem and answer) for calendar submode', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 123 });
    const params: M11Params = {
      subMode: 'calendar',
      calendarSource: 'actual',
      year: 2024,
      month: 5,
      weekStart: 'sun',
      conditionCount: 4,
      calendarTask: 'both',
      dayStartHour: 9,
      dayEndHour: 17,
      errandCount: 4,
      includeTravel: true,
      constraintLevel: 'normal',
    };

    const res = m11Module.generate(ctx, { ...params, ...common });
    expect(res.pages.length).toBe(2);
    expect(res.pages[0]?.pageRole).toBe('problem');
    expect(res.pages[0]?.kind).toBe('html');
    expect(res.pages[0]?.markup).toContain('2024年 5月 カレンダー');
    expect(res.pages[1]?.pageRole).toBe('answer');
    expect(res.pages[1]?.kind).toBe('html');
    expect(res.pages[1]?.markup).toContain('模範解答');
  });

  it('generates 2 pages (problem and answer) for timetable submode', () => {
    const { ctx } = makeTestContext({ moduleId: 'M11', seed: 456 });
    const params: M11Params = {
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

    const res = m11Module.generate(ctx, { ...params, ...common });
    expect(res.pages.length).toBe(2);
    expect(res.pages[0]?.pageRole).toBe('problem');
    expect(res.pages[0]?.kind).toBe('html');
    expect(res.pages[0]?.markup).toContain('1日タイムスケジュール立案');
    expect(res.pages[1]?.pageRole).toBe('answer');
    expect(res.pages[1]?.kind).toBe('html');
    expect(res.pages[1]?.markup).toContain('採点チェックリスト');
  });
});
