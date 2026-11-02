import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import { ANSWER_STYLE, type CommonParams, type M05Params } from '../../../types/schema';
import { m05LinesModule } from './index';
import { generateM05Data } from './logic';

const defaultCancellationParams: M05Params & CommonParams = {
  subMode: 'cancellation',
  linesPerCell: 4,
  lineLengthMm: 20,
  centerPractice: true,
  bisectCount: 6,
  minLengthMm: 100,
  maxLengthMm: 200,
  maxOffsetMm: 30,
  orientation: 'landscape',
  textScale: 100,
  strokeScale: 100,
};

const defaultBisectionParams: M05Params & CommonParams = {
  subMode: 'bisection',
  linesPerCell: 4,
  lineLengthMm: 20,
  centerPractice: true,
  bisectCount: 6,
  minLengthMm: 100,
  maxLengthMm: 200,
  maxOffsetMm: 30,
  orientation: 'landscape',
  textScale: 100,
  strokeScale: 100,
};

describe('M05 線分抹消・線分二等分 logic & render', () => {
  describe('サブモードA: cancellation', () => {
    it('3列均等集計: 左・中・右のターゲット線分数が同数（linesPerCell * 2）であること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 42,
        orientation: 'landscape',
      });
      const linesPerCell = 4;
      const data = generateM05Data(ctx, {
        ...defaultCancellationParams,
        linesPerCell,
      });

      expect(data.subMode).toBe('cancellation');
      if (data.subMode === 'cancellation') {
        const expectedTargetsPerCol = linesPerCell * 2; // 上下2区画 × linesPerCell
        expect(data.columnStats.left.targets).toBe(expectedTargetsPerCol);
        expect(data.columnStats.center.targets).toBe(expectedTargetsPerCol);
        expect(data.columnStats.right.targets).toBe(expectedTargetsPerCol);

        // 総刺激数もターゲット数と一致（抹消対象）
        expect(data.columnStats.left.total).toBe(expectedTargetsPerCol);
        expect(data.columnStats.center.total).toBe(expectedTargetsPerCol);
        expect(data.columnStats.right.total).toBe(expectedTargetsPerCol);
      }
    });

    it('練習線の除外: centerPractice === true のとき練習線が集計に含まれないこと', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 99,
        orientation: 'landscape',
      });
      const linesPerCell = 3;
      const data = generateM05Data(ctx, {
        ...defaultCancellationParams,
        linesPerCell,
        centerPractice: true,
      });

      expect(data.subMode).toBe('cancellation');
      if (data.subMode === 'cancellation') {
        const practiceLines = data.lines.filter((l) => l.isPractice);
        expect(practiceLines.length).toBe(4);

        const totalTargetsInStats =
          data.columnStats.left.targets +
          data.columnStats.center.targets +
          data.columnStats.right.targets;
        expect(totalTargetsInStats).toBe(linesPerCell * 6); // 6区画分のみで練習線4本は含まれない
      }
    });

    it('本文領域への収まり: 全線分の端点が本文領域内に収まっていること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 777,
        orientation: 'landscape',
      });
      const data = generateM05Data(ctx, {
        ...defaultCancellationParams,
        linesPerCell: 5,
        lineLengthMm: 25,
      });

      if (data.subMode === 'cancellation') {
        for (const l of data.lines) {
          expect(l.x1).toBeGreaterThanOrEqual(0);
          expect(l.x2).toBeGreaterThanOrEqual(0);
          expect(l.x1).toBeLessThanOrEqual(ctx.body.widthMm);
          expect(l.x2).toBeLessThanOrEqual(ctx.body.widthMm);
          expect(l.y1).toBeGreaterThanOrEqual(0);
          expect(l.y2).toBeGreaterThanOrEqual(0);
          expect(l.y1).toBeLessThanOrEqual(ctx.body.heightMm);
          expect(l.y2).toBeLessThanOrEqual(ctx.body.heightMm);
        }
      }
    });

    it('決定性テスト: 同一シードで生成した結果が完全一致すること', () => {
      const { ctx: ctx1 } = makeTestContext({
        moduleId: 'M05',
        seed: 1234,
        orientation: 'landscape',
      });
      const { ctx: ctx2 } = makeTestContext({
        moduleId: 'M05',
        seed: 1234,
        orientation: 'landscape',
      });

      const res1 = m05LinesModule.generate(ctx1, defaultCancellationParams);
      const res2 = m05LinesModule.generate(ctx2, defaultCancellationParams);

      expect(res1.pages.length).toBe(2);
      expect(res2.pages.length).toBe(2);
      expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
      expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
    });
  });

  describe('サブモードB: bisection', () => {
    it('真の中点の正確性: 全線分で m === (x1 + x2) / 2 であること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 555,
        orientation: 'landscape',
      });
      const data = generateM05Data(ctx, defaultBisectionParams);

      expect(data.subMode).toBe('bisection');
      if (data.subMode === 'bisection') {
        expect(data.lines.length).toBe(defaultBisectionParams.bisectCount);
        for (const l of data.lines) {
          expect(l.midpoint).toBeCloseTo((l.x1 + l.x2) / 2, 5);
        }
      }
    });

    it('余白の確保: すべての線分が x1 >= 5 かつ x2 <= body.widthMm - 5 に収まっていること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 888,
        orientation: 'landscape',
      });
      const data = generateM05Data(ctx, {
        ...defaultBisectionParams,
        bisectCount: 10,
        maxLengthMm: 200,
        maxOffsetMm: 50,
      });

      if (data.subMode === 'bisection') {
        for (const l of data.lines) {
          expect(l.x1).toBeGreaterThanOrEqual(5);
          expect(l.x2).toBeLessThanOrEqual(ctx.body.widthMm - 5);
        }
      }
    });

    it('パラメータ反転警告: minLengthMm > maxLengthMm のとき PARAM_CLAMPED 警告が出ること', () => {
      const { ctx, warnings } = makeTestContext({
        moduleId: 'M05',
        seed: 321,
        orientation: 'landscape',
      });
      const data = generateM05Data(ctx, {
        ...defaultBisectionParams,
        minLengthMm: 180,
        maxLengthMm: 120,
      });

      expect(warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
      if (data.subMode === 'bisection') {
        for (const l of data.lines) {
          expect(l.length).toBeGreaterThanOrEqual(120);
          expect(l.length).toBeLessThanOrEqual(180);
        }
      }
    });

    it('向きの強制判定: maxLengthMm > 170 で縦向き指定のとき landscape を強制し警告を出すこと', () => {
      const params: M05Params & CommonParams = {
        ...defaultBisectionParams,
        maxLengthMm: 190,
        orientation: 'portrait',
      };

      // module.orientation で landscape が強制される
      const forcedOrientation = m05LinesModule.orientation(params);
      expect(forcedOrientation).toBe('landscape');

      const { ctx, warnings } = makeTestContext({
        moduleId: 'M05',
        seed: 999,
        orientation: 'portrait',
      });
      generateM05Data(ctx, params);

      expect(warnings.some((w) => w.code === 'ORIENTATION_FORCED')).toBe(true);
    });

    it('解答シートのスケール描画: 目盛りテキストと赤太中点線が含まれること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M05',
        seed: 123,
        orientation: 'landscape',
      });
      const res = m05LinesModule.generate(ctx, defaultBisectionParams);

      const answerMarkup = res.pages[1]!.markup;
      expect(answerMarkup).toContain('中');
      expect(answerMarkup).toContain('左5');
      expect(answerMarkup).toContain('右5');
      expect(answerMarkup).toContain('左10');
      expect(answerMarkup).toContain('右10');
      expect(answerMarkup).toContain(`stroke="${ANSWER_STYLE.color}"`);
    });
  });
});
