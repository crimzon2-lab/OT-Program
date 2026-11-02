import { describe, expect, it } from 'vitest';
import { runJob } from '../../../core/generator';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M04Params } from '../../../types/schema';
import { m04KanaPickupModule, m04Module } from './index';
import { generateM04Data } from './logic';

const defaultPassageParams: M04Params & CommonParams = {
  subMode: 'passage',
  targetPreset: 'vowels',
  customTargets: 'あ',
  includeSmallKana: false,
  rows: 10,
  charsPerRow: 25,
  targetRate: 20,
  dakuonDecoys: true,
  spacing: 'solid',
  questionCount: 3,
  questionPlacement: 'samePage',
  charSizeMm: 6,
  textScale: 100,
  strokeScale: 100,
};

const defaultRandomParams: M04Params & CommonParams = {
  subMode: 'random',
  targetPreset: 'vowels',
  customTargets: 'あ',
  includeSmallKana: false,
  rows: 10,
  charsPerRow: 25,
  targetRate: 20,
  dakuonDecoys: true,
  spacing: 'solid',
  questionCount: 3,
  questionPlacement: 'samePage',
  charSizeMm: 6,
  textScale: 100,
  strokeScale: 100,
};

describe('M04 仮名拾い・二重課題 logic & render', () => {
  it('決定性テスト: 同一シードで2回生成した結果が完全一致すること', () => {
    // passage モード
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M04', seed: 12345, orientation: 'portrait' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M04', seed: 12345, orientation: 'portrait' });

    const res1 = m04KanaPickupModule.generate(ctx1, defaultPassageParams);
    const res2 = m04KanaPickupModule.generate(ctx2, defaultPassageParams);

    expect(res1.pages.length).toBe(res2.pages.length);
    for (let i = 0; i < res1.pages.length; i++) {
      expect(res1.pages[i]!.markup).toBe(res2.pages[i]!.markup);
    }

    // random モード
    const { ctx: ctxR1 } = makeTestContext({ moduleId: 'M04', seed: 12345, orientation: 'portrait' });
    const { ctx: ctxR2 } = makeTestContext({ moduleId: 'M04', seed: 12345, orientation: 'portrait' });
    const resR1 = m04KanaPickupModule.generate(ctxR1, defaultRandomParams);
    const resR2 = m04KanaPickupModule.generate(ctxR2, defaultRandomParams);

    expect(resR1.pages[0]!.markup).toBe(resR2.pages[0]!.markup);
    expect(resR1.pages[1]!.markup).toBe(resR2.pages[1]!.markup);
  });

  it('多様性テスト: 異なるシードで生成した結果が異なること', () => {
    // passage モード
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M04', seed: 111, orientation: 'portrait' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M04', seed: 999, orientation: 'portrait' });

    const res1 = m04KanaPickupModule.generate(ctx1, defaultPassageParams);
    const res2 = m04KanaPickupModule.generate(ctx2, defaultPassageParams);

    expect(res1.pages[0]!.markup).not.toBe(res2.pages[0]!.markup);

    // random モード
    const { ctx: ctxR1 } = makeTestContext({ moduleId: 'M04', seed: 111, orientation: 'portrait' });
    const { ctx: ctxR2 } = makeTestContext({ moduleId: 'M04', seed: 999, orientation: 'portrait' });
    const resR1 = m04KanaPickupModule.generate(ctxR1, defaultRandomParams);
    const resR2 = m04KanaPickupModule.generate(ctxR2, defaultRandomParams);

    expect(resR1.pages[0]!.markup).not.toBe(resR2.pages[0]!.markup);
  });

  describe('random モードのテスト', () => {
    it('指定した行数・列数で正しく文字グリッドが生成されること', () => {
      const { ctx } = makeTestContext({ moduleId: 'M04', seed: 42, orientation: 'portrait' });
      const params: M04Params & CommonParams = {
        ...defaultRandomParams,
        rows: 8,
        charsPerRow: 20,
        targetPreset: 'custom',
        customTargets: 'かさ',
        dakuonDecoys: true,
      };

      const data = generateM04Data(ctx, params);
      expect(data.lines.length).toBe(8);
      for (const line of data.lines) {
        expect(line.chars.length).toBe(20);
      }
      expect(data.targets).toBe('かさ');
    });

    it('dakuonDecoys: true のとき濁音・半濁音が含まれ、かつ非ターゲットとして判定されること', () => {
      const { ctx } = makeTestContext({ moduleId: 'M04', seed: 777, orientation: 'portrait' });
      const params: M04Params & CommonParams = {
        ...defaultRandomParams,
        targetPreset: 'custom',
        customTargets: 'か',
        dakuonDecoys: true,
        rows: 15,
        charsPerRow: 30,
      };

      const data = generateM04Data(ctx, params);
      let decoyFound = false;
      for (const line of data.lines) {
        for (const item of line.chars) {
          if (item.ch === 'が') {
            decoyFound = true;
            expect(item.isTarget).toBe(false);
          }
          if (item.ch === 'か') {
            expect(item.isTarget).toBe(true);
          }
        }
      }
      expect(decoyFound).toBe(true);
    });
  });

  describe('passage モードのテスト', () => {
    it('spacing: solid と wakachi で正解文字総数 totalTargets が完全一致すること', () => {
      const { ctx: ctxSolid } = makeTestContext({ moduleId: 'M04', seed: 50, orientation: 'portrait' });
      const { ctx: ctxWakachi } = makeTestContext({ moduleId: 'M04', seed: 50, orientation: 'portrait' });

      const dataSolid = generateM04Data(ctxSolid, { ...defaultPassageParams, spacing: 'solid' });
      const dataWakachi = generateM04Data(ctxWakachi, { ...defaultPassageParams, spacing: 'wakachi' });

      expect(dataSolid.totalTargets).toBe(dataWakachi.totalTargets);
      expect(dataSolid.passage?.id).toBe(dataWakachi.passage?.id);
    });

    it('includeSmallKana の ON/OFF で小書き文字の判定が切り替わること', () => {
      // 母音ターゲット（あいうえお）
      const { ctx: ctxOff } = makeTestContext({ moduleId: 'M04', seed: 10, orientation: 'portrait' });
      const { ctx: ctxOn } = makeTestContext({ moduleId: 'M04', seed: 10, orientation: 'portrait' });

      const dataOff = generateM04Data(ctxOff, { ...defaultPassageParams, includeSmallKana: false });
      const dataOn = generateM04Data(ctxOn, { ...defaultPassageParams, includeSmallKana: true });

      // 小書き文字を含む文章の場合、ON の方が targetCount が多くなるか同等
      expect(dataOn.totalTargets).toBeGreaterThanOrEqual(dataOff.totalTargets);
    });

    it('内容確認問題の選択肢シャッフル後も正答が正しく追従していること', () => {
      const { ctx } = makeTestContext({ moduleId: 'M04', seed: 100, orientation: 'portrait' });
      const data = generateM04Data(ctx, defaultPassageParams);

      expect(data.questions).toBeDefined();
      expect(data.questions?.length).toBe(3);
      expect(data.passage).toBeDefined();

      const origQuestions = data.passage!.questions;
      for (let i = 0; i < data.questions!.length; i++) {
        const generatedQ = data.questions![i]!;
        const origQ = origQuestions[i]!;

        const expectedAnswerText = origQ.choices[origQ.answerIndex];
        const actualAnswerText = generatedQ.choices[generatedQ.answerIndex];

        expect(actualAnswerText).toBe(expectedAnswerText);
      }
    });

    it('questionPlacement: samePage は問題・解答の計2ページ、nextPage は計4ページであること', () => {
      const { ctx: ctxSame } = makeTestContext({ moduleId: 'M04', seed: 200, orientation: 'portrait' });
      const resSame = m04KanaPickupModule.generate(ctxSame, {
        ...defaultPassageParams,
        questionPlacement: 'samePage',
      });
      expect(resSame.pages.length).toBe(2);
      expect(resSame.pages[0]!.pageRole).toBe('problem');
      expect(resSame.pages[1]!.pageRole).toBe('answer');

      const { ctx: ctxNext } = makeTestContext({ moduleId: 'M04', seed: 200, orientation: 'portrait' });
      const resNext = m04KanaPickupModule.generate(ctxNext, {
        ...defaultPassageParams,
        questionPlacement: 'nextPage',
      });
      expect(resNext.pages.length).toBe(4);
      expect(resNext.pages[0]!.pageRole).toBe('problem');
      expect(resNext.pages[1]!.pageRole).toBe('problem');
      expect(resNext.pages[2]!.pageRole).toBe('answer');
      expect(resNext.pages[3]!.pageRole).toBe('answer');
    });

    it('解答シートに解答用ハイライト赤丸・行末正解数が含まれること', () => {
      const { ctx } = makeTestContext({ moduleId: 'M04', seed: 300, orientation: 'portrait' });
      const res = m04KanaPickupModule.generate(ctx, defaultPassageParams);

      const problemSvg = res.pages[0]!.markup;
      const answerSvg = res.pages[1]!.markup;

      // 問題シートには赤丸がない
      expect(problemSvg).not.toContain('<circle');
      expect(problemSvg).not.toContain('<ellipse');

      // 解答シートには赤丸と行末正解数カッコが含まれる
      expect(answerSvg).toMatch(/<circle|<ellipse/);
      expect(answerSvg).toContain('（');
    });
  });

  describe('境界値・安全実行テスト', () => {
    it('極小文字・極大文字・スケーリング時も正常に生成できること', () => {
      const testCases: Partial<M04Params & CommonParams>[] = [
        { charSizeMm: 4, textScale: 70, strokeScale: 50 },
        { charSizeMm: 9, textScale: 200, strokeScale: 300 },
        { subMode: 'random', rows: 6, charsPerRow: 15, targetRate: 10 },
        { subMode: 'random', rows: 20, charsPerRow: 35, targetRate: 30 },
        { subMode: 'passage', questionCount: 2 },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const { ctx } = makeTestContext({ moduleId: 'M04', seed: 500 + i, orientation: 'portrait' });
        const res = m04KanaPickupModule.generate(ctx, {
          ...defaultPassageParams,
          ...testCases[i],
        });
        expect(res.pages.length).toBeGreaterThanOrEqual(2);
        for (const p of res.pages) {
          expect(p.markup.startsWith('<svg')).toBe(true);
          expect(p.markup.endsWith('</svg>')).toBe(true);
        }
      }
    });

    it('runJob 統合テスト: moduleOverride でジョブ実行できること', () => {
      const jobResult = runJob(
        {
          moduleId: 'M04',
          seed: 42,
          batchCount: 2,
          outputMode: 'withAnswer',
          answerOrder: 'grouped',
          params: defaultPassageParams,
        },
        m04Module,
      );

      expect(jobResult.pages.length).toBe(4);
      expect(jobResult.warnings.length).toBe(0);
      expect(jobResult.pages[0]!.seedCode).toContain('RP1-M04-42');
    });
  });
});
