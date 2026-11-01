/**
 * 契約（schema.ts）の型が意図通り機能するかのコンパイル兼実行テスト。
 * 後続タスクのモジュール定義の書き方見本も兼ねる。
 */
import { describe, expect, it } from 'vitest';
import {
  BODY_BOX,
  CROCKFORD_ALPHABET,
  defineModule,
  HIRAGANA_DAKUON,
  HIRAGANA_HANDAKUON,
  HIRAGANA_SEION,
  MODULE_IDS,
  PAGE_GEOMETRY,
  STIMULUS_CHARSETS,
  type M02Params,
  type ParamSchema,
  type TaskModule,
} from './schema';

// --- 見本：M02 のパラメータスキーマ（実装時は modules/attention/m02-tmt/index.ts に置く） ---
const sampleSchema: ParamSchema<M02Params> = [
  {
    kind: 'select', key: 'part', code: 1, label: 'パート',
    options: [{ value: 'A', label: 'Part A（数字）' }, { value: 'B', label: 'Part B（数字とかな）' }],
    default: 'A',
  },
  { kind: 'int', key: 'nodeCount', code: 2, label: 'ノード数', min: 10, max: 30, step: 1, default: 25 },
  { kind: 'int', key: 'nodeDiameterMm', code: 3, label: 'ノード直径', min: 6, max: 16, step: 1, default: 10, unit: 'mm' },
  {
    kind: 'select', key: 'orientation', code: 4, label: '用紙の向き',
    options: [{ value: 'landscape', label: '横' }, { value: 'portrait', label: '縦' }],
    default: 'landscape',
  },
  { kind: 'bool', key: 'practice', code: 5, label: '練習枠', default: true },
];

const sampleModule: TaskModule<M02Params> = {
  id: 'M02',
  domain: 'attention',
  title: 'TMT様課題',
  shortTitle: 'TMT',
  description: 'テスト用',
  paramSchema: sampleSchema,
  orientation: (p) => p.orientation,
  generate: (ctx) => ({
    pages: [{
      pageRole: 'problem',
      kind: 'svg',
      markup: `<svg width="${ctx.body.widthMm}mm"></svg>`,
    }],
  }),
};

describe('schema 契約', () => {
  it('defineModule で型消去できる', () => {
    const any = defineModule(sampleModule);
    expect(any.id).toBe('M02');
    expect(any.paramSchema).toHaveLength(5);
  });

  it('本文領域が用紙ジオメトリと整合する', () => {
    const g = PAGE_GEOMETRY;
    const bands = g.marginMm * 2 + g.headerMm + g.instructionMm + g.footerMm;
    expect(BODY_BOX.portrait.heightMm).toBeLessThanOrEqual(g.paper.portrait.heightMm - g.sheetHeightSafetyMm - bands);
    expect(BODY_BOX.landscape.heightMm).toBeLessThanOrEqual(g.paper.landscape.heightMm - g.sheetHeightSafetyMm - bands);
    expect(BODY_BOX.portrait.widthMm).toBe(g.paper.portrait.widthMm - g.marginMm * 2);
    expect(BODY_BOX.landscape.widthMm).toBe(g.paper.landscape.widthMm - g.marginMm * 2);
  });

  it('文字テーブルの件数と重複', () => {
    expect([...HIRAGANA_SEION]).toHaveLength(46);
    expect(new Set(HIRAGANA_SEION).size).toBe(46);
    expect([...HIRAGANA_DAKUON]).toHaveLength(21);
    expect([...HIRAGANA_HANDAKUON]).toHaveLength(5);
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/);
    for (const set of Object.values(STIMULUS_CHARSETS)) {
      expect(new Set(set).size).toBe([...set].length);
    }
    expect(MODULE_IDS).toHaveLength(12);
  });
});
