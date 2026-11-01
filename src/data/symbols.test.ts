import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS } from '../types/schema';
import { getCancellationSymbols, getSdmtSymbols, SYMBOLS } from './symbols';

describe('symbols master data', () => {
  it('最低収録件数を満たしていること', () => {
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(15);

    const cancellationSymbols = getCancellationSymbols();
    expect(cancellationSymbols.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.cancellationSymbols);

    const sdmtSymbols = getSdmtSymbols();
    expect(sdmtSymbols.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.sdmtSymbols);
  });

  it('IDに重複がなく、命名規則に沿っていること', () => {
    const ids = SYMBOLS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const sym of SYMBOLS) {
      expect(sym.id).toMatch(/^sym-[a-z0-9-]+$/);
      expect(sym.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('全記号の usage と filled が正しく設定されていること', () => {
    const validUsages = new Set(['cancellation', 'sdmt', 'both']);
    for (const sym of SYMBOLS) {
      expect(validUsages.has(sym.usage)).toBe(true);
      expect(typeof sym.filled).toBe('boolean');
    }
  });

  it('全パスが有効なSVGパス構文であり、NaNやundefinedを含まず正規化範囲(0〜10)内に収まっていること', () => {
    for (const sym of SYMBOLS) {
      const path = sym.path.trim();
      expect(path.length).toBeGreaterThan(0);
      expect(path).not.toContain('NaN');
      expect(path).not.toContain('undefined');
      expect(path).not.toContain('null');

      // 有効なSVGパスコマンド (M/m) で開始されていること
      expect(path).toMatch(/^[Mm]\s*[-+]?[0-9]/);

      // パス内のすべての数値を抽出して正規化範囲 [0, 10] に収まっていることを検証
      const numbers = path.match(/[-+]?(?:\d*\.\d+|\d+)/g);
      expect(numbers).not.toBeNull();
      if (numbers) {
        for (const numStr of numbers) {
          const val = Number.parseFloat(numStr);
          expect(Number.isNaN(val)).toBe(false);
          // viewBox は 0 0 10 10 のため、0 以上 10 以下であることを検証
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('getCancellationSymbols が正しくフィルタリングされていること', () => {
    const symbols = getCancellationSymbols();
    for (const sym of symbols) {
      expect(['cancellation', 'both']).toContain(sym.usage);
    }
  });

  it('getSdmtSymbols が正しくフィルタリングされていること', () => {
    const symbols = getSdmtSymbols();
    for (const sym of symbols) {
      expect(['sdmt', 'both']).toContain(sym.usage);
      // 数字 1〜9 や文字 O, X, + 等と誤読しやすい白丸・十字・バツ・四角が含まれていないことを確認
      expect(['sym-circle', 'sym-cross', 'sym-x', 'sym-square', 'sym-square-filled']).not.toContain(
        sym.id,
      );
    }
  });
});
