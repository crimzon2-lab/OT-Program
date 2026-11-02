import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M07Params } from '../../../types/schema';
import { m07Module, m07SerialNBackModule } from './index';
import { generateM07Data } from './logic';

const defaultSerialAdditionParams: M07Params & CommonParams = {
  subMode: 'serialAddition',
  additionRows: 8,
  additionDigits: 15,
  nBackLevel: '1',
  nBackItem: 'digit',
  nBackRows: 6,
  nBackLength: 15,
  matchRate: 30,
  textScale: 100,
  strokeScale: 100,
};

const defaultNBackParams: M07Params & CommonParams = {
  subMode: 'nBack',
  additionRows: 8,
  additionDigits: 15,
  nBackLevel: '1',
  nBackItem: 'digit',
  nBackRows: 6,
  nBackLength: 15,
  matchRate: 30,
  textScale: 100,
  strokeScale: 100,
};

describe('M07 連続計算・紙面N-back logic & render', () => {
  describe('サブモードA: serialAddition', () => {
    it('数字範囲と正答の完全一致: 全数字が 3..9 であり、正答配列が (a + b) % 10 と 100% 一致すること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M07',
        seed: 111,
        orientation: 'portrait',
      });
      const data = generateM07Data(ctx, defaultSerialAdditionParams);

      expect(data.subMode).toBe('serialAddition');
      if (data.subMode === 'serialAddition') {
        expect(data.rows.length).toBe(defaultSerialAdditionParams.additionRows);
        for (const row of data.rows) {
          expect(row.digits.length).toBe(defaultSerialAdditionParams.additionDigits);
          expect(row.answers.length).toBe(defaultSerialAdditionParams.additionDigits - 1);

          for (const d of row.digits) {
            expect(d).toBeGreaterThanOrEqual(3);
            expect(d).toBeLessThanOrEqual(9);
          }

          // 正答検証
          for (let i = 0; i < row.answers.length; i++) {
            const expectedAns = (row.digits[i]! + row.digits[i + 1]!) % 10;
            expect(row.answers[i]).toBe(expectedAns);
          }

          // 3連続同一数字禁止の検証
          for (let i = 2; i < row.digits.length; i++) {
            const threeConsecutive =
              row.digits[i] === row.digits[i - 1] &&
              row.digits[i] === row.digits[i - 2];
            expect(threeConsecutive).toBe(false);
          }
        }
      }
    });

    it('文字サイズ調整警告: textScale 200% かつ最大桁数・最大行数のとき LAYOUT_SCALED 警告が出ること', () => {
      const { ctx, warnings } = makeTestContext({
        moduleId: 'M07',
        seed: 222,
        orientation: 'portrait',
      });
      const res = m07SerialNBackModule.generate(ctx, {
        ...defaultSerialAdditionParams,
        additionRows: 20,
        additionDigits: 30,
        textScale: 200,
      });

      expect(res.pages.length).toBe(2);
      expect(warnings.some((w) => w.code === 'LAYOUT_SCALED')).toBe(true);
    });

    it('決定性テスト: 同一シードで生成した結果が完全一致すること', () => {
      const { ctx: ctx1 } = makeTestContext({
        moduleId: 'M07',
        seed: 333,
        orientation: 'portrait',
      });
      const { ctx: ctx2 } = makeTestContext({
        moduleId: 'M07',
        seed: 333,
        orientation: 'portrait',
      });

      const res1 = m07SerialNBackModule.generate(ctx1, defaultSerialAdditionParams);
      const res2 = m07SerialNBackModule.generate(ctx2, defaultSerialAdditionParams);

      expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
      expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
    });
  });

  describe('サブモードB: nBack', () => {
    it('1-back の正誤完全整合性: 先頭 1 個は非対象であり、i >= 1 では isMatch が seq[i] === seq[i - 1] と完全一致すること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M07',
        seed: 444,
        orientation: 'portrait',
      });
      const data = generateM07Data(ctx, {
        ...defaultNBackParams,
        nBackLevel: '1',
        nBackLength: 16,
      });

      expect(data.subMode).toBe('nBack');
      if (data.subMode === 'nBack') {
        expect(data.n).toBe(1);
        for (const row of data.rows) {
          expect(row.items[0]!.isStart).toBe(true);
          expect(row.items[0]!.isMatch).toBe(false);

          for (let i = 1; i < row.items.length; i++) {
            const it = row.items[i]!;
            const prev = row.items[i - 1]!;
            const actuallyMatches = it.char === prev.char;
            expect(it.isMatch).toBe(actuallyMatches);
          }

          // 行末の matchCount と items の isMatch 数が一致
          const matchCount = row.items.filter((it) => it.isMatch).length;
          expect(row.matchCount).toBe(matchCount);
          expect(row.matchCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('2-back の正誤完全整合性: 先頭 2 個は非対象であり、i >= 2 では isMatch が seq[i] === seq[i - 2] と完全一致すること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M07',
        seed: 555,
        orientation: 'portrait',
      });
      const data = generateM07Data(ctx, {
        ...defaultNBackParams,
        nBackLevel: '2',
        nBackLength: 18,
        nBackItem: 'hiragana',
      });

      if (data.subMode === 'nBack') {
        expect(data.n).toBe(2);
        for (const row of data.rows) {
          expect(row.items[0]!.isStart).toBe(true);
          expect(row.items[0]!.isMatch).toBe(false);
          expect(row.items[1]!.isStart).toBe(true);
          expect(row.items[1]!.isMatch).toBe(false);

          for (let i = 2; i < row.items.length; i++) {
            const it = row.items[i]!;
            const target = row.items[i - 2]!;
            const actuallyMatches = it.char === target.char;
            expect(it.isMatch).toBe(actuallyMatches);
          }
        }
      }
    });

    it('偶発的一致ゼロの検証: 指定された一致位置以外での一致が一切発生しないこと', () => {
      for (const seed of [10, 20, 30, 40, 50]) {
        const { ctx } = makeTestContext({
          moduleId: 'M07',
          seed,
          orientation: 'portrait',
        });
        const data = generateM07Data(ctx, {
          ...defaultNBackParams,
          nBackLevel: '1',
          nBackLength: 20,
        });

        if (data.subMode === 'nBack') {
          for (const row of data.rows) {
            for (let i = 1; i < row.items.length; i++) {
              const it = row.items[i]!;
              const prev = row.items[i - 1]!;
              if (!it.isMatch) {
                expect(it.char).not.toBe(prev.char);
              } else {
                expect(it.char).toBe(prev.char);
              }
            }
          }
        }
      }
    });

    it('解答シート描画: 赤丸と一致数表記が含まれること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M07',
        seed: 777,
        orientation: 'portrait',
      });
      const res = m07Module.generate(ctx, defaultNBackParams);

      expect(res.pages.length).toBe(2);
      const answerMarkup = res.pages[1]!.markup;
      expect(answerMarkup).toContain('circle');
      expect(answerMarkup).toContain('正解:');
      expect(answerMarkup).toContain('開始');
    });
  });
});
