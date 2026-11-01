import { describe, expect, it } from 'vitest';
import type { AnyTaskModule, JobRequest } from '../types/schema';
import { runJob } from './generator';

describe('src/core/generator.ts', () => {
  const mock3PageModule: AnyTaskModule = {
    id: 'M01',
    domain: 'attention',
    title: '抹消課題',
    shortTitle: '抹消',
    description: 'テストモジュール',
    paramSchema: [
      {
        key: 'difficulty',
        code: 1,
        kind: 'int',
        label: '難易度',
        min: 1,
        max: 5,
        step: 1,
        default: 3,
      },
    ],
    orientation: () => 'portrait',
    generate: (ctx, params) => {
      ctx.warn('COUNT_ROUNDED', '数量調整');
      return {
        pages: [
          {
            pageRole: 'stimulus',
            kind: 'svg',
            markup: `<svg>stimulus-${ctx.sheetIndex}</svg>`,
          },
          {
            pageRole: 'problem',
            kind: 'svg',
            markup: `<svg>problem-${ctx.sheetIndex}-diff${params.difficulty}</svg>`,
          },
          {
            pageRole: 'answer',
            kind: 'svg',
            markup: `<svg>answer-${ctx.sheetIndex}</svg>`,
          },
        ],
      };
    },
  };

  it('filters answer pages when outputMode is problemOnly', () => {
    const req: JobRequest = {
      moduleId: 'M01',
      seed: 12345,
      batchCount: 2,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
      params: { difficulty: 3, textScale: 100, strokeScale: 100 },
    };

    const result = runJob(req, mock3PageModule);
    // 2 sheets * 2 pages (stimulus + problem) = 4 pages
    expect(result.pages.length).toBe(4);
    expect(result.pages.every((p) => p.body.pageRole !== 'answer')).toBe(true);

    // pageNo should be 1/2 and 2/2 for each sheet
    expect(result.pages[0]!.pageNo).toBe(1);
    expect(result.pages[0]!.pageTotal).toBe(2);
    expect(result.pages[1]!.pageNo).toBe(2);
    expect(result.pages[1]!.pageTotal).toBe(2);
  });

  it('orders pages as grouped: all problems then all answers', () => {
    const req: JobRequest = {
      moduleId: 'M01',
      seed: 12345,
      batchCount: 2,
      outputMode: 'withAnswer',
      answerOrder: 'grouped',
      params: { difficulty: 3, textScale: 100, strokeScale: 100 },
    };

    const result = runJob(req, mock3PageModule);
    // 2 sheets * 3 pages = 6 pages
    expect(result.pages.length).toBe(6);

    const roles = result.pages.map((p) => p.body.pageRole);
    expect(roles).toEqual([
      'stimulus', // sheet 1
      'problem', // sheet 1
      'stimulus', // sheet 2
      'problem', // sheet 2
      'answer', // sheet 1
      'answer', // sheet 2
    ]);

    // Sheet 1 answer page still records sheetIndex 1 and pageNo 3/3
    const sheet1Answer = result.pages[4]!;
    expect(sheet1Answer.sheetIndex).toBe(1);
    expect(sheet1Answer.pageNo).toBe(3);
    expect(sheet1Answer.pageTotal).toBe(3);
  });

  it('orders pages as interleaved: sheet 1 all then sheet 2 all', () => {
    const req: JobRequest = {
      moduleId: 'M01',
      seed: 12345,
      batchCount: 2,
      outputMode: 'withAnswer',
      answerOrder: 'interleaved',
      params: { difficulty: 3, textScale: 100, strokeScale: 100 },
    };

    const result = runJob(req, mock3PageModule);
    expect(result.pages.length).toBe(6);

    const roles = result.pages.map((p) => p.body.pageRole);
    expect(roles).toEqual([
      'stimulus', // sheet 1
      'problem', // sheet 1
      'answer', // sheet 1
      'stimulus', // sheet 2
      'problem', // sheet 2
      'answer', // sheet 2
    ]);
  });

  it('aggregates warnings across multiple sheets into single message with sheet numbers', () => {
    const req: JobRequest = {
      moduleId: 'M01',
      seed: 12345,
      batchCount: 3,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
      params: { difficulty: 10 }, // Out of range (max 5) -> triggers PARAM_CLAMPED
    };

    const result = runJob(req, mock3PageModule);
    // PARAM_CLAMPED should be present
    expect(result.warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
    // COUNT_ROUNDED appeared in all 3 sheets -> aggregated into "（1・2・3枚目）"
    const countWarn = result.warnings.find((w) => w.code === 'COUNT_ROUNDED');
    expect(countWarn).toBeDefined();
    expect(countWarn!.message).toContain('（1・2・3枚目）');
  });

  it('guarantees identical output for startSheetIndex reproduction', () => {
    const batchReq: JobRequest = {
      moduleId: 'M01',
      seed: 9999,
      batchCount: 3,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
      params: { difficulty: 2 },
    };
    const batchResult = runJob(batchReq, mock3PageModule);

    // Re-generate sheet 3 alone
    const singleReq: JobRequest = {
      moduleId: 'M01',
      seed: 9999,
      batchCount: 1,
      startSheetIndex: 3,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
      params: { difficulty: 2 },
    };
    const singleResult = runJob(singleReq, mock3PageModule);

    // Sheet 3 problem markup in batch should match single sheet 3
    const batchSheet3Problem = batchResult.pages.find(
      (p) => p.sheetIndex === 3 && p.body.pageRole === 'problem',
    );
    const singleSheet3Problem = singleResult.pages.find(
      (p) => p.sheetIndex === 3 && p.body.pageRole === 'problem',
    );

    expect(batchSheet3Problem!.body.markup).toBe(singleSheet3Problem!.body.markup);
    expect(batchSheet3Problem!.seedCode).toBe(singleSheet3Problem!.seedCode);
  });

  it('throws error when module attempts to draw same poolKey twice in same context', () => {
    const faultyModule: AnyTaskModule = {
      ...mock3PageModule,
      generate: (ctx) => {
        ctx.draw('poolX', [1, 2, 3], 1);
        ctx.draw('poolX', [1, 2, 3], 1); // double draw
        return { pages: [] };
      },
    };

    const req: JobRequest = {
      moduleId: 'M01',
      seed: 123,
      batchCount: 1,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
      params: {},
    };

    expect(() => runJob(req, faultyModule)).toThrow(/already been drawn/);
  });
});
