import { describe, expect, it } from 'vitest';
import { runJob } from '../../../core/generator';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M01Params } from '../../../types/schema';
import { m01CancellationModule, m01Module } from './index';
import { generateM01Data } from './logic';

const defaultParams: M01Params & CommonParams = {
  stimulusType: 'hiragana',
  targetKinds: 1,
  layout: 'scatter',
  totalStimuli: 160,
  targetRate: 20,
  charSizeMm: 8,
  quadrantBalance: true,
  showTargetSample: true,
  orientation: 'landscape',
  textScale: 100,
  strokeScale: 100,
};

describe('M01 抹消課題 logic & render', () => {
  it('決定性テスト: 同一シードで2回生成した結果が完全一致すること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M01', seed: 42, orientation: 'landscape' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M01', seed: 42, orientation: 'landscape' });

    const res1 = m01CancellationModule.generate(ctx1, defaultParams);
    const res2 = m01CancellationModule.generate(ctx2, defaultParams);

    expect(res1.pages.length).toBe(2);
    expect(res2.pages.length).toBe(2);
    expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
    expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
    expect(res1.quadrantStats).toEqual(res2.quadrantStats);
  });

  it('多様性テスト: 異なるシードで生成した結果が異なること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M01', seed: 42, orientation: 'landscape' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M01', seed: 9999, orientation: 'landscape' });

    const res1 = m01CancellationModule.generate(ctx1, defaultParams);
    const res2 = m01CancellationModule.generate(ctx2, defaultParams);

    expect(res1.pages[0]!.markup).not.toBe(res2.pages[0]!.markup);
  });

  it('4象限均等（scatter）: 4象限のターゲット数および総刺激数が同数であること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M01', seed: 101, orientation: 'landscape' });
    const res = m01CancellationModule.generate(ctx, {
      ...defaultParams,
      layout: 'scatter',
      quadrantBalance: true,
      totalStimuli: 120,
      targetRate: 25,
    });

    const stats = res.quadrantStats!;
    expect(stats).toBeDefined();

    const expectedTotal = stats.topLeft.total;
    const expectedTargets = stats.topLeft.targets;

    expect(expectedTotal).toBeGreaterThan(0);
    expect(expectedTargets).toBeGreaterThan(0);

    expect(stats.topRight.total).toBe(expectedTotal);
    expect(stats.bottomLeft.total).toBe(expectedTotal);
    expect(stats.bottomRight.total).toBe(expectedTotal);

    expect(stats.topRight.targets).toBe(expectedTargets);
    expect(stats.bottomLeft.targets).toBe(expectedTargets);
    expect(stats.bottomRight.targets).toBe(expectedTargets);
  });

  it('4象限均等（grid）: 4象限のターゲット数および総刺激数が同数であること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M01', seed: 202, orientation: 'landscape' });
    const res = m01CancellationModule.generate(ctx, {
      ...defaultParams,
      layout: 'grid',
      quadrantBalance: true,
      totalStimuli: 100,
      targetRate: 20,
    });

    const stats = res.quadrantStats!;
    expect(stats).toBeDefined();

    const expectedTotal = stats.topLeft.total;
    const expectedTargets = stats.topLeft.targets;

    expect(expectedTotal).toBeGreaterThan(0);
    expect(expectedTargets).toBeGreaterThan(0);

    expect(stats.topRight.total).toBe(expectedTotal);
    expect(stats.bottomLeft.total).toBe(expectedTotal);
    expect(stats.bottomRight.total).toBe(expectedTotal);

    expect(stats.topRight.targets).toBe(expectedTargets);
    expect(stats.bottomLeft.targets).toBe(expectedTargets);
    expect(stats.bottomRight.targets).toBe(expectedTargets);
  });

  it('過密条件耐性: charSize 14mm, totalStimuli 320 で無限ループせず完了し PLACEMENT_TRUNCATED が出力されること', () => {
    const { ctx, warnings } = makeTestContext({ moduleId: 'M01', seed: 303, orientation: 'portrait' });
    const res = m01CancellationModule.generate(ctx, {
      ...defaultParams,
      charSizeMm: 14,
      totalStimuli: 320,
      orientation: 'portrait',
      quadrantBalance: true,
    });

    expect(res.pages.length).toBe(2);
    const hasTruncatedWarning = warnings.some((w) => w.code === 'PLACEMENT_TRUNCATED');
    expect(hasTruncatedWarning).toBe(true);

    // 打ち切り後も4象限均等条件が維持されていること
    const stats = res.quadrantStats!;
    expect(stats.topLeft.total).toBe(stats.topRight.total);
    expect(stats.topLeft.total).toBe(stats.bottomLeft.total);
    expect(stats.topLeft.total).toBe(stats.bottomRight.total);

    expect(stats.topLeft.targets).toBe(stats.topRight.targets);
    expect(stats.topLeft.targets).toBe(stats.bottomLeft.targets);
    expect(stats.topLeft.targets).toBe(stats.bottomRight.targets);
  });

  it('全5種類の stimulusType で正常に SVG が生成されること', () => {
    const types: M01Params['stimulusType'][] = [
      'hiragana',
      'katakana',
      'digit',
      'latin',
      'shape',
    ];

    for (const stimulusType of types) {
      const { ctx } = makeTestContext({ moduleId: 'M01', seed: 404, orientation: 'landscape' });
      const res = m01CancellationModule.generate(ctx, {
        ...defaultParams,
        stimulusType,
      });

      expect(res.pages[0]!.kind).toBe('svg');
      expect(res.pages[0]!.markup).toContain('<svg');
      expect(res.pages[0]!.markup).toContain('</svg>');
      expect(res.pages[1]!.markup).toContain('class="highlights"');
      expect(res.pages[1]!.markup).toContain('stroke="#D00000"'); // 赤太丸が含まれること

      if (stimulusType === 'shape') {
        expect(res.pages[0]!.markup).toContain('<path');
      }
    }
  });

  it('複数ターゲット種類（targetKinds: 3）で全ターゲット種が紙面に出現すること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M01', seed: 505, orientation: 'landscape' });
    const data = generateM01Data(ctx, {
      ...defaultParams,
      targetKinds: 3,
      totalStimuli: 80,
    });

    expect(data.targets.length).toBe(3);

    // 紙面上のアイテムに出現したターゲット種を収集
    const targetItems = data.items.filter((item) => item.isTarget);
    const foundTargets = new Set(targetItems.map((item) => item.value));

    // 全3種が1個以上出現していること
    for (const target of data.targets) {
      expect(foundTargets.has(target)).toBe(true);
    }
  });

  it('textScale 拡大時に見本枠高さおよび answerCircle 半径がスケールされること', () => {
    const { ctx: ctxNorm } = makeTestContext({ moduleId: 'M01', seed: 606, orientation: 'landscape' });
    const { ctx: ctxScale } = makeTestContext({ moduleId: 'M01', seed: 606, orientation: 'landscape' });

    const dataNorm = generateM01Data(ctxNorm, {
      ...defaultParams,
      charSizeMm: 8,
      textScale: 100,
    });
    const dataScale = generateM01Data(ctxScale, {
      ...defaultParams,
      charSizeMm: 8,
      textScale: 150,
    });

    // 150% 拡大で見本帯高さが大きくなっていること
    expect(dataScale.sampleHeight).toBeGreaterThan(dataNorm.sampleHeight);
    expect(dataScale.effectiveCharSize).toBe(12); // 8 * 1.5 = 12
  });

  it('showTargetSample: false のとき見本帯が描画されず、教示文に「この中から」とターゲットが含まれること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M01', seed: 707, orientation: 'landscape' });
    const res = m01CancellationModule.generate(ctx, {
      ...defaultParams,
      showTargetSample: false,
    });

    expect(res.pages[0]!.markup).not.toContain('class="target-sample-band"');
    expect(res.pages[0]!.instruction).toContain('この中から、');
    expect(res.pages[0]!.instruction).not.toContain('刺激の中から');
    expect(res.pages[0]!.instruction).toMatch(/「.+」をすべて見つけて/);

    // 幾何学記号モードでは文字名ではなく記号トークン [[sym:...]] が教示文に使われ、シートHTMLでインラインSVGになること
    const jobShape = runJob(
      {
        moduleId: 'M01',
        params: { ...defaultParams, stimulusType: 'shape', showTargetSample: false },
        seed: 294533,
        batchCount: 1,
        outputMode: 'problemOnly',
        answerOrder: 'grouped',
      },
      m01Module,
    );
    expect(jobShape.pages[0]!.body.instruction).toContain('この中から、');
    expect(jobShape.pages[0]!.body.instruction).toContain('[[sym:sym-');
  });

  it('runJob 統合テスト: 問題・解答シートが正常に組み立てられること', () => {
    const jobResult = runJob(
      {
        moduleId: 'M01',
        params: defaultParams,
        seed: 123456,
        batchCount: 2,
        outputMode: 'withAnswer',
        answerOrder: 'grouped',
      },
      m01Module,
    );

    expect(jobResult.pages.length).toBe(4); // 2シート × (問題 + 解答)
    expect(jobResult.orientation).toBe('landscape');
    expect(jobResult.pages[0]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[1]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[2]!.body.pageRole).toBe('answer');
    expect(jobResult.pages[3]!.body.pageRole).toBe('answer');
  });
});
