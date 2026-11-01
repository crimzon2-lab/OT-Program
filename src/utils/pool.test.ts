import { describe, expect, it, vi } from 'vitest';
import { drawFromPool } from './pool';

describe('src/utils/pool.ts', () => {
  const mockItems = Object.freeze([
    'item-01',
    'item-02',
    'item-03',
    'item-04',
    'item-05',
    'item-06',
    'item-07',
    'item-08',
    'item-09',
    'item-10',
    'item-11',
    'item-12',
  ]);

  it('draws zero duplicate items across sheets 1 to 3 with sufficient pool', () => {
    const warn = vi.fn();
    const sheet1 = drawFromPool({
      seed: 42,
      moduleId: 'M08',
      sheetIndex: 1,
      poolKey: 'vocab',
      items: mockItems,
      count: 4,
      warn,
    });
    const sheet2 = drawFromPool({
      seed: 42,
      moduleId: 'M08',
      sheetIndex: 2,
      poolKey: 'vocab',
      items: mockItems,
      count: 4,
      warn,
    });
    const sheet3 = drawFromPool({
      seed: 42,
      moduleId: 'M08',
      sheetIndex: 3,
      poolKey: 'vocab',
      items: mockItems,
      count: 4,
      warn,
    });

    expect(sheet1.length).toBe(4);
    expect(sheet2.length).toBe(4);
    expect(sheet3.length).toBe(4);

    const all = [...sheet1, ...sheet2, ...sheet3];
    expect(new Set(all).size).toBe(12);
    expect(warn).not.toHaveBeenCalled();
  });

  it('guarantees identical output for standalone sheetIndex recreation', () => {
    const warn = vi.fn();
    const sheet3Batch = drawFromPool({
      seed: 12345,
      moduleId: 'M11',
      sheetIndex: 3,
      poolKey: 'errand',
      items: mockItems,
      count: 3,
      warn,
    });
    const sheet3Standalone = drawFromPool({
      seed: 12345,
      moduleId: 'M11',
      sheetIndex: 3,
      poolKey: 'errand',
      items: mockItems,
      count: 3,
      warn,
    });

    expect(sheet3Batch).toEqual(sheet3Standalone);
  });

  it('handles wraparound across pool boundary with zero within-sheet duplicates and POOL_EXHAUSTED warning', () => {
    const smallPool = Object.freeze(['A', 'B', 'C', 'D', 'E']);
    const warn = vi.fn();

    // Sheet 1 takes 3 items (indices 0, 1, 2)
    const s1 = drawFromPool({
      seed: 999,
      moduleId: 'M04',
      sheetIndex: 1,
      poolKey: 'small',
      items: smallPool,
      count: 3,
      warn,
    });
    expect(s1.length).toBe(3);
    expect(warn).not.toHaveBeenCalled();

    // Sheet 2 takes 3 items (indices 3, 4, 0) -> crosses boundary
    const s2 = drawFromPool({
      seed: 999,
      moduleId: 'M04',
      sheetIndex: 2,
      poolKey: 'small',
      items: smallPool,
      count: 3,
      warn,
    });
    expect(s2.length).toBe(3);
    expect(new Set(s2).size).toBe(3); // Zero duplicate within sheet
    expect(warn).toHaveBeenCalledWith('POOL_EXHAUSTED', expect.any(String));
  });

  it('truncates count to items.length when count exceeds pool size, preventing within-sheet duplicates', () => {
    const tinyPool = Object.freeze(['X', 'Y']);
    const warn = vi.fn();

    const res = drawFromPool({
      seed: 100,
      moduleId: 'M10',
      sheetIndex: 1,
      poolKey: 'tiny',
      items: tinyPool,
      count: 5,
      warn,
    });

    expect(res.length).toBe(2);
    expect(new Set(res).size).toBe(2);
    expect(warn).toHaveBeenCalledWith('POOL_EXHAUSTED', expect.any(String));
  });

  it('does not mutate the input array', () => {
    const original = ['1', '2', '3'];
    const frozen = Object.freeze([...original]);
    const warn = vi.fn();

    expect(() =>
      drawFromPool({
        seed: 777,
        moduleId: 'M08',
        sheetIndex: 1,
        poolKey: 'immutable',
        items: frozen,
        count: 2,
        warn,
      }),
    ).not.toThrow();
  });
});
