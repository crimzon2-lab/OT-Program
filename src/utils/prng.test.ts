import { describe, expect, it } from 'vitest';
import {
  AUTO_SEED_MAX,
  AUTO_SEED_MIN,
  createPoolRng,
  createRng,
  createSheetRng,
  cyrb53,
  deriveSeed,
  generateNumericSeed,
  hashStringToUint32,
  mulberry32,
  normalizeSeedInput,
} from './prng';

/**
 * ゴールデン値テスト：この値が変わった場合、過去に印刷した
 * シードコードが再現できなくなっている。prng.ts の改変を疑うこと。
 */
describe('prng golden values (変更禁止)', () => {
  it('mulberry32 の先頭 3 値', () => {
    const g = mulberry32(482914);
    const v = [g(), g(), g()].map((x) => Math.floor(x * 1e9));
    expect(v).toMatchInlineSnapshot(`
      [
        561219490,
        823651912,
        51317787,
      ]
    `);
  });

  it('cyrb53 / hashStringToUint32', () => {
    expect(cyrb53('reha-print')).toMatchInlineSnapshot(`5157440992726062`);
    expect(hashStringToUint32('あいうえお')).toMatchInlineSnapshot(`4005966804`);
  });

  it('deriveSeed', () => {
    expect(deriveSeed(482914, 'M01', 'sheet', 1)).toMatchInlineSnapshot(`1928224920`);
  });

  it('shuffle / sample の結果', () => {
    const rng = createRng(12345);
    expect(rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toMatchInlineSnapshot(`
      [
        7,
        5,
        9,
        1,
        2,
        8,
        6,
        4,
        3,
        10,
      ]
    `);
    expect(rng.sample(['a', 'b', 'c', 'd', 'e', 'f'], 3)).toMatchInlineSnapshot(`
      [
        "e",
        "d",
        "f",
      ]
    `);
  });
});

describe('Rng 基本性質', () => {
  it('同一シードは同一系列', () => {
    const a = createRng(1);
    const b = createRng(1);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('int は両端を含み範囲外を返さない', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
    expect(() => rng.int(5, 4)).toThrow();
  });

  it('shuffle は元配列を変更せず、要素集合を保存する', () => {
    const src = [1, 2, 3, 4, 5];
    const out = createRng(3).shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(src);
  });

  it('sample は重複なし・k 個', () => {
    const out = createRng(9).sample([...'abcdefghij'], 10);
    expect(new Set(out).size).toBe(10);
    expect(() => createRng(9).sample([1, 2], 3)).toThrow();
  });

  it('fork は親の消費状態に依存しない', () => {
    const p1 = createRng(100);
    const p2 = createRng(100);
    p2.next();
    p2.next();
    expect(p1.fork('layout').next()).toBe(p2.fork('layout').next());
    expect(p1.fork('layout').next()).not.toBe(p1.fork('words').next());
  });

  it('pickWeighted は重み 0 を選ばない', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) expect(rng.pickWeighted(['a', 'b', 'c'], [1, 0, 1])).not.toBe('b');
  });

  it('createSheetRng はシート番号で系列が変わる / createPoolRng はシート非依存', () => {
    expect(createSheetRng(1, 'M01', 1).next()).not.toBe(createSheetRng(1, 'M01', 2).next());
    expect(createPoolRng(1, 'M08', 'vocab').next()).toBe(createPoolRng(1, 'M08', 'vocab').next());
  });
});

describe('シード入力', () => {
  it('normalizeSeedInput', () => {
    expect(normalizeSeedInput(' 482914 ')).toBe(482914);
    expect(normalizeSeedInput('４８２９１４')).toBe(482914);
    expect(normalizeSeedInput('')).toBeNull();
    expect(normalizeSeedInput('abc')).toBe(hashStringToUint32('abc'));
    expect(normalizeSeedInput('4294967296')).toBe(hashStringToUint32('4294967296'));
  });

  it('generateNumericSeed は 5〜6 桁', () => {
    for (let i = 0; i < 200; i++) {
      const s = generateNumericSeed();
      expect(s).toBeGreaterThanOrEqual(AUTO_SEED_MIN);
      expect(s).toBeLessThanOrEqual(AUTO_SEED_MAX);
    }
  });
});
