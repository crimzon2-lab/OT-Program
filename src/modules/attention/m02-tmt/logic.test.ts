import { describe, expect, it } from 'vitest';
import { runJob } from '../../../core/generator';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M02Params } from '../../../types/schema';
import { dist } from '../../../utils/geometry';
import { fmt } from '../../../utils/html';
import { m02Module, m02TmtModule } from './index';
import { generateM02Data } from './logic';

const defaultParams: M02Params & CommonParams = {
  part: 'A',
  nodeCount: 25,
  nodeDiameterMm: 10,
  orientation: 'landscape',
  practice: true,
  textScale: 100,
  strokeScale: 100,
};

describe('M02 TMT様課題 logic & render', () => {
  it('決定性テスト: 同一シードで2回生成した結果が完全一致すること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M02', seed: 42, orientation: 'landscape' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M02', seed: 42, orientation: 'landscape' });

    const res1 = m02TmtModule.generate(ctx1, defaultParams);
    const res2 = m02TmtModule.generate(ctx2, defaultParams);

    expect(res1.pages.length).toBe(2);
    expect(res2.pages.length).toBe(2);
    expect(res1.pages[0]!.markup).toBe(res2.pages[0]!.markup);
    expect(res1.pages[1]!.markup).toBe(res2.pages[1]!.markup);
  });

  it('多様性テスト: 異なるシードで生成した結果が異なること', () => {
    const { ctx: ctx1 } = makeTestContext({ moduleId: 'M02', seed: 42, orientation: 'landscape' });
    const { ctx: ctx2 } = makeTestContext({ moduleId: 'M02', seed: 9999, orientation: 'landscape' });

    const res1 = m02TmtModule.generate(ctx1, defaultParams);
    const res2 = m02TmtModule.generate(ctx2, defaultParams);

    expect(res1.pages[0]!.markup).not.toBe(res2.pages[0]!.markup);
  });

  it('Part A: 1からNまでの数字が順に並んでいること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 101, orientation: 'landscape' });
    const data = generateM02Data(ctx, { ...defaultParams, part: 'A', nodeCount: 15 });

    expect(data.mainNodes.length).toBe(15);
    for (let i = 0; i < 15; i++) {
      expect(data.mainNodes[i]!.label).toBe(String(i + 1));
      expect(data.mainNodes[i]!.isStart).toBe(i === 0);
      expect(data.mainNodes[i]!.isEnd).toBe(i === 14);
    }
    expect(data.pathSequence).toBe('1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15');
  });

  it('Part B: 数字とひらがなが交互に並び、ノード数が偶数であること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 202, orientation: 'landscape' });
    // nodeCount 15（奇数）を指定した場合でも偶数（14）に切り下げられること
    const data = generateM02Data(ctx, { ...defaultParams, part: 'B', nodeCount: 15 });

    expect(data.mainNodes.length).toBe(14);
    expect(data.mainNodes.length % 2).toBe(0);

    const expectedLabels = ['1', 'あ', '2', 'い', '3', 'う', '4', 'え', '5', 'お', '6', 'か', '7', 'き'];
    for (let i = 0; i < 14; i++) {
      expect(data.mainNodes[i]!.label).toBe(expectedLabels[i]);
    }
  });

  it('全本課題ノード間の中心間距離が直径＋minGap以上保たれていること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 303, orientation: 'landscape' });
    const data = generateM02Data(ctx, { ...defaultParams, nodeCount: 20, nodeDiameterMm: 10 });

    const nodes = data.mainNodes;
    const effectiveDiameter = data.effectiveDiameter;
    const minGap = Math.max(8, effectiveDiameter * 0.8);
    const minDist = effectiveDiameter + minGap;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i]!, nodes[j]!);
        // 浮動小数点誤差を考慮して少しのマージン (0.01mm) を許容
        expect(d).toBeGreaterThanOrEqual(minDist - 0.01);
      }
    }
  });

  it('過密条件耐性: nodeCount 30, nodeDiameter 16mm, portrait で安全終了し PLACEMENT_TRUNCATED が出力されること', () => {
    const { ctx, warnings } = makeTestContext({ moduleId: 'M02', seed: 404, orientation: 'portrait' });
    const res = m02TmtModule.generate(ctx, {
      ...defaultParams,
      part: 'B',
      nodeCount: 30,
      nodeDiameterMm: 16,
      orientation: 'portrait',
    });

    expect(res.pages.length).toBe(2);
    const hasTruncated = warnings.some((w) => w.code === 'PLACEMENT_TRUNCATED');
    expect(hasTruncated).toBe(true);

    // 開始・終了ノードが存在し、マークアップに「開始」「終了」が含まれていること
    expect(res.pages[0]!.markup).toContain('開始');
    expect(res.pages[0]!.markup).toContain('終了');
  });

  it('解答用紙のSVGにおいてノード円が白塗り(fill="#ffffff")であり、正解経路がノード円より前の層に描画されること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 505, orientation: 'landscape' });
    const res = m02TmtModule.generate(ctx, defaultParams);

    const answerSvg = res.pages[1]!.markup;

    // 白塗り circle の確認
    expect(answerSvg).toContain('fill="#ffffff"');

    // 赤破線経路の確認
    expect(answerSvg).toContain('stroke="#D00000"');
    expect(answerSvg).toContain('stroke-dasharray');

    // レイヤー順の確認: class="answer-path" が class="main-nodes" より前（DOMの先行位置）にあること
    const pathIndex = answerSvg.indexOf('class="answer-path"');
    const nodesIndex = answerSvg.indexOf('class="main-nodes"');
    expect(pathIndex).toBeGreaterThan(-1);
    expect(nodesIndex).toBeGreaterThan(-1);
    expect(pathIndex).toBeLessThan(nodesIndex);
  });

  it('Part B の練習枠: 誘導破線が先頭2ノードを結び、練習ノードに isPractice が付与されていること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 606, orientation: 'landscape' });
    const data = generateM02Data(ctx, { ...defaultParams, part: 'B', practice: true });

    expect(data.practiceNodes.length).toBe(5);
    expect(data.practiceNodes.map((n) => n.label)).toEqual(['1', 'あ', '2', 'い', '3']);

    for (const node of data.practiceNodes) {
      expect(node.isPractice).toBe(true);
    }

    const { ctx: ctxRender } = makeTestContext({ moduleId: 'M02', seed: 606, orientation: 'landscape' });
    const res = m02TmtModule.generate(ctxRender, { ...defaultParams, part: 'B', practice: true });

    const p1 = data.practiceNodes[0]!;
    const p2 = data.practiceNodes[1]!;
    // 先頭2ノードを結ぶ line 要素が含まれていること
    expect(res.pages[0]!.markup).toContain(
      `x1="${fmt(p1.x)}" y1="${fmt(p1.y)}" x2="${fmt(p2.x)}" y2="${fmt(p2.y)}"`,
    );
  });

  it('textScale 200% 拡大時でも練習枠ノード径が 10mm 以下に制限されること', () => {
    const { ctx } = makeTestContext({ moduleId: 'M02', seed: 707, orientation: 'landscape' });
    const data = generateM02Data(ctx, {
      ...defaultParams,
      nodeDiameterMm: 12,
      textScale: 200, // effectiveDiameter = 24mm
    });

    expect(data.effectiveDiameter).toBe(24);
    // 練習枠ノード径は上限 10mm に制限されていること
    expect(data.practiceDiameter).toBeLessThanOrEqual(10);
  });

  it('runJob 統合テスト: M02 が正常に問題・解答シートを生成できること', () => {
    const jobResult = runJob(
      {
        moduleId: 'M02',
        params: defaultParams,
        seed: 8888,
        batchCount: 2,
        outputMode: 'withAnswer',
        answerOrder: 'grouped',
      },
      m02Module,
    );

    expect(jobResult.pages.length).toBe(4);
    expect(jobResult.orientation).toBe('landscape');
    expect(jobResult.pages[0]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[1]!.body.pageRole).toBe('problem');
    expect(jobResult.pages[2]!.body.pageRole).toBe('answer');
    expect(jobResult.pages[3]!.body.pageRole).toBe('answer');
  });
});
