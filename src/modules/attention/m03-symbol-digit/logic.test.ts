import { describe, expect, it } from 'vitest';
import { runJob } from '../../../core/generator';
import { makeTestContext } from '../../../core/testing';
import { getSdmtSymbols } from '../../../data/symbols';
import type { CommonParams, M03Params } from '../../../types/schema';
import { m03Module, m03SymbolDigitModule } from './index';
import { generateM03Data } from './logic';

const defaultParams: M03Params & CommonParams = {
  pairCount: 9,
  rows: 6,
  cols: 12,
  practiceCells: 6,
  shuffleMapping: true,
  textScale: 100,
  strokeScale: 100,
};

describe('M03 符号変換課題 logic & render', () => {
  it('決定性テスト: 同一シードで2回生成した結果が完全一致すること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M03', seed: 42, orientation: 'portrait' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M03', seed: 42, orientation: 'portrait' });

    const res1 = m03SymbolDigitModule.generate(ctx1, defaultParams);
    const res2 = m03SymbolDigitModule.generate(ctx2, defaultParams);

    expect(res1.pages.length).toBe(2);
    expect(res2.pages.length).toBe(2);
    expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
    expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
  });

  it('多様性テスト: 異なるシードで生成した結果が異なること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M03', seed: 42, orientation: 'portrait' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M03', seed: 9999, orientation: 'portrait' });

    const res1 = m03SymbolDigitModule.generate(ctx1, defaultParams);
    const res2 = m03SymbolDigitModule.generate(ctx2, defaultParams);

    expect(res1.pages[0]!.markup).not.toBe(res2.pages[0]!.markup);
  });

  it('複数シード連続で横隣接重複がゼロであること（同一行で隣り合う記号が絶対に同じにならない）', () => {
    const seeds = [1, 23, 456, 7890, 99999];

    for (const seed of seeds) {
      const { ctx } = makeTestContext({ moduleId: 'M03', seed, orientation: 'portrait' });
      const data = generateM03Data(ctx, defaultParams);

      for (let r = 0; r < data.rows; r++) {
        for (let c = 1; c < data.cols; c++) {
          const current = data.grid[r]![c]!.symbol.id;
          const prev = data.grid[r]![c - 1]!.symbol.id;
          expect(current).not.toBe(prev);
        }
      }
    }
  });

  it('複数シード連続で各記号の出現頻度差が最大1以内であること', () => {
    const seeds = [10, 202, 3030, 40404];

    for (const seed of seeds) {
      const { ctx } = makeTestContext({ moduleId: 'M03', seed, orientation: 'portrait' });
      const data = generateM03Data(ctx, { ...defaultParams, rows: 5, cols: 11, pairCount: 7 });

      const counts = new Map<string, number>();
      for (const row of data.grid) {
        for (const cell of row) {
          counts.set(cell.symbol.id, (counts.get(cell.symbol.id) ?? 0) + 1);
        }
      }

      const values = Array.from(counts.values());
      const min = Math.min(...values);
      const max = Math.max(...values);
      expect(max - min).toBeLessThanOrEqual(1);
    }
  });

  it('shuffleMapping の挙動: false なら固定順、true ならシャッフルされること', () => {
    const { ctx: ctxFixed } = makeTestContext({ moduleId: 'M03', seed: 123, orientation: 'portrait' });
    const dataFixed = generateM03Data(ctxFixed, { ...defaultParams, shuffleMapping: false });

    const sdmtSymbols = getSdmtSymbols().slice(0, defaultParams.pairCount);
    for (let i = 0; i < defaultParams.pairCount; i++) {
      expect(dataFixed.keys[i]!.symbol.id).toBe(sdmtSymbols[i]!.id);
      expect(dataFixed.keys[i]!.digit).toBe(i + 1);
    }

    const { ctx: ctxShuffled } = makeTestContext({ moduleId: 'M03', seed: 123, orientation: 'portrait' });
    const dataShuffled = generateM03Data(ctxShuffled, { ...defaultParams, shuffleMapping: true });

    // シャッフル時は元の配列順と異なること
    const isSameOrder = dataShuffled.keys.every((k, i) => k.symbol.id === sdmtSymbols[i]!.id);
    expect(isSameOrder).toBe(false);
  });

  it('行跨ぎ練習マス: cols: 8, practiceCells: 12 で1行目全8マスと2行目先頭4マスが練習マスになること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M03', seed: 505, orientation: 'portrait' });
    const data = generateM03Data(ctx, {
      ...defaultParams,
      rows: 4,
      cols: 8,
      practiceCells: 12,
    });

    expect(data.practiceCells).toBe(12);
    expect(data.mainCells).toBe(20); // 32 - 12 = 20

    // 1行目: 全8マスが練習
    for (let c = 0; c < 8; c++) {
      expect(data.grid[0]![c]!.isPractice).toBe(true);
    }

    // 2行目: 先頭4マスが練習、残り4マスは本課題
    for (let c = 0; c < 4; c++) {
      expect(data.grid[1]![c]!.isPractice).toBe(true);
    }
    for (let c = 4; c < 8; c++) {
      expect(data.grid[1]![c]!.isPractice).toBe(false);
    }

    // 3, 4行目: すべて本課題
    for (let r = 2; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        expect(data.grid[r]![c]!.isPractice).toBe(false);
      }
    }
  });

  it('practiceCells: 0 のとき練習マスが0個で練習ラベルが描画されないこと', () => {
    const { ctx } = makeTestContext({ moduleId: 'M03', seed: 606, orientation: 'portrait' });
    const res = m03SymbolDigitModule.generate(ctx, { ...defaultParams, practiceCells: 0 });

    expect(res.pages[0]!.markup).not.toContain('【練習】');
  });

  it('最大条件境界値: rows: 10, cols: 16, textScale: 200 で正常に描画されエラーなく完了すること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M03', seed: 707, orientation: 'portrait' });
    const res = m03SymbolDigitModule.generate(ctx, {
      ...defaultParams,
      rows: 10,
      cols: 16,
      textScale: 200,
      strokeScale: 300,
    });

    expect(res.pages.length).toBe(2);
    expect(res.pages[0]!.kind).toBe('svg');
    expect(res.pages[0]!.markup).toContain('<svg width="186mm" height="237mm"');
  });

  it('解答用紙に正答数字が含まれ、練習マスと本課題マスが視覚的に区別されていること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M03', seed: 808, orientation: 'portrait' });
    const res = m03SymbolDigitModule.generate(ctx, { ...defaultParams, practiceCells: 3 });

    const answerSvg = res.pages[1]!.markup;

    // 練習マスの括弧書き正答数字が含まれること
    expect(answerSvg).toMatch(/\(\d\)/);
    // 練習マスの淡グレー背景が含まれること
    expect(answerSvg).toContain('fill="#f0f0f0"');
    // 教示文に満点マス数と練習マス数が明記されていること（72 - 3 = 69）
    expect(res.pages[1]!.instruction).toContain('本課題マス数（満点）：69 点');
  });

  it('runJob 統合テスト: M03 が正常に問題・解答シートを生成できること', () => {
    const jobResult = runJob(
      {
        moduleId: 'M03',
        params: defaultParams,
        seed: 9999,
        batchCount: 2,
        outputMode: 'withAnswer',
        answerOrder: 'grouped',
      },
      m03Module,
    );

    expect(jobResult.pages.length).toBe(4);
    expect(jobResult.orientation).toBe('portrait');
    expect(jobResult.pages[0]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[1]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[2]!.body.pageRole).toBe('answer');
    expect(jobResult.pages[3]!.body.pageRole).toBe('answer');
  });
});
