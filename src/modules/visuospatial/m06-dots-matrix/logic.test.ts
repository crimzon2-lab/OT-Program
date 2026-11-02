import { describe, expect, it } from 'vitest';
import { runJob } from '../../../core/generator';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, JobRequest, M06Params } from '../../../types/schema';
import { m06DotsMatrixModule, m06Module } from './index';
import { generateM06Data } from './logic';

const defaultDotCopyParams: M06Params & CommonParams = {
  subMode: 'dotCopy',
  dotGrid: 4,
  segmentCount: 6,
  allowDiagonal: true,
  copyLayout: 'leftRight',
  figureCount: 2,
  matrixSize: 4,
  filledCells: 5,
  matrixCount: 4,
  orientation: 'portrait',
  textScale: 100,
  strokeScale: 100,
};

const defaultSpatialMatrixParams: M06Params & CommonParams = {
  subMode: 'spatialMatrix',
  dotGrid: 4,
  segmentCount: 6,
  allowDiagonal: true,
  copyLayout: 'leftRight',
  figureCount: 2,
  matrixSize: 4,
  filledCells: 5,
  matrixCount: 4,
  orientation: 'portrait',
  textScale: 100,
  strokeScale: 100,
};

describe('M06 点つなぎ・空間記憶 logic & render', () => {
  describe('サブモードA: dotCopy', () => {
    it('線分数と重複なし: 線分数が指定通りであり、重複線分が存在しないこと', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M06',
        seed: 101,
        orientation: 'portrait',
      });
      const segmentCount = 7;
      const data = generateM06Data(ctx, {
        ...defaultDotCopyParams,
        segmentCount,
        figureCount: 2,
      });

      expect(data.subMode).toBe('dotCopy');
      if (data.subMode === 'dotCopy') {
        expect(data.figures.length).toBe(2);
        for (const fig of data.figures) {
          expect(fig.segments.length).toBe(segmentCount);

          // 重複無向辺のチェック
          const edgeSet = new Set<string>();
          for (const seg of fig.segments) {
            const p1 = `${seg.from.r},${seg.from.c}`;
            const p2 = `${seg.to.r},${seg.to.c}`;
            const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            expect(edgeSet.has(key)).toBe(false);
            edgeSet.add(key);
          }
        }
      }
    });

    it('斜め線禁止テスト: allowDiagonal === false のとき斜め線分が一切含まれないこと', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M06',
        seed: 202,
        orientation: 'portrait',
      });
      const data = generateM06Data(ctx, {
        ...defaultDotCopyParams,
        allowDiagonal: false,
        segmentCount: 8,
      });

      if (data.subMode === 'dotCopy') {
        for (const fig of data.figures) {
          for (const seg of fig.segments) {
            const dr = Math.abs(seg.from.r - seg.to.r);
            const dc = Math.abs(seg.from.c - seg.to.c);
            // 上下左右の4近傍（マンハッタン距離 1）のみ
            expect(dr + dc).toBe(1);
          }
        }
      }
    });

    it('飛び越し辺の禁止: すべての線分が距離1ステップ（チェビシェフ距離1）であること', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M06',
        seed: 303,
        orientation: 'portrait',
      });
      const data = generateM06Data(ctx, {
        ...defaultDotCopyParams,
        allowDiagonal: true,
        segmentCount: 10,
      });

      if (data.subMode === 'dotCopy') {
        for (const fig of data.figures) {
          for (const seg of fig.segments) {
            const dr = Math.abs(seg.from.r - seg.to.r);
            const dc = Math.abs(seg.from.c - seg.to.c);
            expect(Math.max(dr, dc)).toBe(1);
            expect(dr + dc).toBeGreaterThan(0);
          }
        }
      }
    });

    it('決定性テスト: 同一シードで生成した結果が完全一致すること', () => {
      const { ctx: ctx1 } = makeTestContext({
        moduleId: 'M06',
        seed: 404,
        orientation: 'portrait',
      });
      const { ctx: ctx2 } = makeTestContext({
        moduleId: 'M06',
        seed: 404,
        orientation: 'portrait',
      });

      const res1 = m06DotsMatrixModule.generate(ctx1, defaultDotCopyParams);
      const res2 = m06DotsMatrixModule.generate(ctx2, defaultDotCopyParams);

      expect(res1.pages.length).toBe(2);
      expect(res2.pages.length).toBe(2);
      expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
      expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
    });
  });

  describe('サブモードB: spatialMatrix', () => {
    it('3ページ構成テスト: pages が stimulus, problem, answer の3枚組を返すこと', () => {
      const { ctx } = makeTestContext({
        moduleId: 'M06',
        seed: 505,
        orientation: 'portrait',
      });
      const res = m06DotsMatrixModule.generate(ctx, defaultSpatialMatrixParams);

      expect(res.pages.length).toBe(3);
      expect(res.pages[0]!.pageRole).toBe('stimulus');
      expect(res.pages[1]!.pageRole).toBe('problem');
      expect(res.pages[2]!.pageRole).toBe('answer');

      // 提示用シートに黒塗りセル #111111 が含まれ、回答シートは白抜き（#ffffff のみ）であること
      expect(res.pages[0]!.markup).toContain('fill="#111111"');
      expect(res.pages[1]!.markup).not.toContain('fill="#111111"');
    });

    it('セル数クランプ警告: filledCells が上限 (size*size/2) を超えるとき PARAM_CLAMPED 警告が出ること', () => {
      const { ctx, warnings } = makeTestContext({
        moduleId: 'M06',
        seed: 606,
        orientation: 'portrait',
      });
      // 3x3 の上限は floor(9/2) = 4
      const data = generateM06Data(ctx, {
        ...defaultSpatialMatrixParams,
        matrixSize: 3,
        filledCells: 8,
      });

      expect(warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
      if (data.subMode === 'spatialMatrix') {
        expect(data.filledCells).toBe(4);
        for (const mat of data.matrices) {
          expect(mat.filledIndices.length).toBe(4);
        }
      }
    });

    it('runJob バッチテスト（problemOnly）: stimulus と problem の2ページが出力されること', () => {
      const req: JobRequest = {
        moduleId: 'M06',
        seed: 707,
        batchCount: 1,
        params: defaultSpatialMatrixParams,
        outputMode: 'problemOnly',
        answerOrder: 'grouped',
      };

      const res = runJob(req, m06Module);
      expect(res.pages.length).toBe(2);
      expect(res.pages[0]!.body.pageRole).toBe('stimulus');
      expect(res.pages[1]!.body.pageRole).toBe('problem');
    });

    it('runJob バッチテスト（withAnswer, grouped）: 全シートの問題群（stimulus+problem）の後に解答群が並ぶこと', () => {
      const req: JobRequest = {
        moduleId: 'M06',
        seed: 808,
        batchCount: 2,
        params: defaultSpatialMatrixParams,
        outputMode: 'withAnswer',
        answerOrder: 'grouped',
      };

      const res = runJob(req, m06Module);
      // 各シート 2問 + 1解答 = 3ページ。計 6ページ
      expect(res.pages.length).toBe(6);

      // grouped: 問題群 (シート1のstimulus, problem, シート2のstimulus, problem) → 解答群 (シート1のans, シート2のans)
      expect(res.pages[0]!.body.pageRole).toBe('stimulus');
      expect(res.pages[1]!.body.pageRole).toBe('problem');
      expect(res.pages[2]!.body.pageRole).toBe('stimulus');
      expect(res.pages[3]!.body.pageRole).toBe('problem');
      expect(res.pages[4]!.body.pageRole).toBe('answer');
      expect(res.pages[5]!.body.pageRole).toBe('answer');
    });

    it('runJob バッチテスト（withAnswer, interleaved）: シートごとに stimulus → problem → answer と並ぶこと', () => {
      const req: JobRequest = {
        moduleId: 'M06',
        seed: 909,
        batchCount: 2,
        params: defaultSpatialMatrixParams,
        outputMode: 'withAnswer',
        answerOrder: 'interleaved',
      };

      const res = runJob(req, m06Module);
      expect(res.pages.length).toBe(6);

      // interleaved: シート1 (stimulus, problem, ans) → シート2 (stimulus, problem, ans)
      expect(res.pages[0]!.body.pageRole).toBe('stimulus');
      expect(res.pages[1]!.body.pageRole).toBe('problem');
      expect(res.pages[2]!.body.pageRole).toBe('answer');
      expect(res.pages[3]!.body.pageRole).toBe('stimulus');
      expect(res.pages[4]!.body.pageRole).toBe('problem');
      expect(res.pages[5]!.body.pageRole).toBe('answer');
    });
  });
});
