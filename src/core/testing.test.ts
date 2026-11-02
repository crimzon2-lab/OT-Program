import { afterEach, describe, expect, it } from 'vitest';
import type { AnyTaskModule } from '../types/schema';
import {
  ALL_MODULES,
  getModule,
  getModulesByDomain,
  registerModuleForTest,
  resetRegistryForTest,
} from './registry';
import { makeTestContext } from './testing';

describe('src/core/testing.ts and registry.ts', () => {
  afterEach(() => {
    resetRegistryForTest();
  });

  describe('makeTestContext', () => {
    it('creates context with sensible defaults', () => {
      const { ctx, warnings } = makeTestContext();
      expect(ctx.moduleId).toBe('M01');
      expect(ctx.seed).toBe(12345);
      expect(ctx.sheetIndex).toBe(1);
      expect(ctx.orientation).toBe('portrait');
      expect(ctx.body).toEqual({ widthMm: 186, heightMm: 237 });
      expect(warnings).toEqual([]);
    });

    it('collects warnings via warn()', () => {
      const { ctx, warnings } = makeTestContext({ sheetIndex: 2 });
      ctx.warn('COUNT_ROUNDED', 'テスト警告');
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toEqual({
        code: 'COUNT_ROUNDED',
        message: 'テスト警告',
        sheetIndex: 2,
      });
    });

    it('draws from pool and throws error if poolKey is drawn twice in same context', () => {
      const { ctx } = makeTestContext();
      const items = ['a', 'b', 'c', 'd'];
      const drawn = ctx.draw('pool1', items, 2);
      expect(drawn.length).toBe(2);

      // Same poolKey again in same context must throw Error
      expect(() => ctx.draw('pool1', items, 2)).toThrow(/already been drawn/);

      // Different poolKey is allowed
      expect(() => ctx.draw('pool2', items, 2)).not.toThrow();
    });
  });

  describe('registry', () => {
    const dummyModule: AnyTaskModule = {
      id: 'M12',
      domain: 'iadl',
      title: 'ダミー課題',
      shortTitle: 'ダミー',
      description: 'テスト説明',
      paramSchema: [],
      orientation: () => 'portrait',
      generate: () => ({ pages: [] }),
    };

    it('contains all 12 modules in ALL_MODULES', () => {
      expect(ALL_MODULES.length).toBe(12);
      expect(getModule('M01')?.title).toBe('抹消課題');
      expect(getModule('M02')?.title).toBe('TMT様課題');
      expect(getModule('M03')?.title).toBe('符号変換課題');
      expect(getModule('M04')?.title).toBe('仮名拾い課題');
      expect(getModule('M11')?.title).toBe('スケジュール・カレンダー');
      expect(getModule('M12')?.title).toBe('服薬管理・残薬計算');
      expect(getModulesByDomain('attention').length).toBe(4);
      expect(getModulesByDomain('iadl').length).toBe(4);
    });

    it('allows registering and getting test modules, and cleans up with unregister / reset', () => {
      const originalM12 = getModule('M12');
      expect(originalM12).toBeDefined();
      expect(originalM12).not.toBe(dummyModule);

      const unregister = registerModuleForTest(dummyModule);
      expect(getModule('M12')).toBe(dummyModule);

      // Call unregister
      unregister();
      expect(getModule('M12')).toBe(originalM12);
    });

    it('cleans up via resetRegistryForTest', () => {
      const originalM12 = getModule('M12');
      registerModuleForTest(dummyModule);
      expect(getModule('M12')).toBe(dummyModule);
      resetRegistryForTest();
      expect(getModule('M12')).toBe(originalM12);
    });
  });
});
