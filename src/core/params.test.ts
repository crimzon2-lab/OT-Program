import { describe, expect, it } from 'vitest';
import type { AnyTaskModule } from '../types/schema';
import {
  COMMON_PARAM_FIELDS,
  getDefaultParams,
  getFullSchema,
  isFieldVisible,
  sanitizeParams,
  valuesEqual,
} from './params';

describe('src/core/params.ts', () => {
  const dummyModule: Pick<AnyTaskModule, 'paramSchema'> = {
    paramSchema: [
      {
        key: 'itemCount',
        code: 1,
        kind: 'int',
        label: '項目数',
        min: 10,
        max: 50,
        step: 5,
        default: 20,
      },
      {
        key: 'difficulty',
        code: 2,
        kind: 'select',
        label: '難易度',
        options: [
          { value: 'easy', label: '簡単' },
          { value: 'hard', label: '難しい' },
        ],
        default: 'easy',
      },
      {
        key: 'enabled',
        code: 3,
        kind: 'bool',
        label: '有効化',
        default: true,
      },
      {
        key: 'categories',
        code: 4,
        kind: 'multi',
        label: 'カテゴリ',
        options: [
          { value: 'food', label: '食事' },
          { value: 'daily', label: '日用品' },
          { value: 'stationery', label: '文具' },
        ],
        default: ['food'],
        minSelected: 1,
      },
      {
        key: 'customLetters',
        code: 5,
        kind: 'charSet',
        label: 'カスタム文字',
        alphabet: 'あいうえお',
        default: 'あい',
        minCount: 1,
        maxCount: 3,
        visibleWhen: [{ key: 'difficulty', equals: 'hard' }],
      },
    ],
  };

  it('defines COMMON_PARAM_FIELDS with expected codes and constraints', () => {
    expect(COMMON_PARAM_FIELDS.length).toBe(2);
    expect(COMMON_PARAM_FIELDS[0].key).toBe('textScale');
    expect(COMMON_PARAM_FIELDS[1].key).toBe('strokeScale');
  });

  it('getFullSchema appends COMMON_PARAM_FIELDS to module schema', () => {
    const full = getFullSchema(dummyModule);
    expect(full.length).toBe(dummyModule.paramSchema.length + 2);
    expect(full.some((f) => f.key === 'textScale')).toBe(true);
    expect(full.some((f) => f.key === 'strokeScale')).toBe(true);
  });

  it('getDefaultParams extracts defaults for all fields including common ones', () => {
    const defaults = getDefaultParams(dummyModule);
    expect(defaults).toEqual({
      itemCount: 20,
      difficulty: 'easy',
      enabled: true,
      categories: ['food'],
      customLetters: 'あい',
      textScale: 100,
      strokeScale: 100,
    });
  });

  describe('valuesEqual', () => {
    it('compares primitives correctly', () => {
      expect(valuesEqual(10, 10)).toBe(true);
      expect(valuesEqual(10, 20)).toBe(false);
      expect(valuesEqual('a', 'a')).toBe(true);
      expect(valuesEqual('a', 'b')).toBe(false);
      expect(valuesEqual(true, true)).toBe(true);
      expect(valuesEqual(true, false)).toBe(false);
    });

    it('compares arrays regardless of element order', () => {
      expect(valuesEqual(['a', 'b'], ['b', 'a'])).toBe(true);
      expect(valuesEqual(['a', 'b'], ['a', 'c'])).toBe(false);
      expect(valuesEqual(['a'], ['a', 'b'])).toBe(false);
    });
  });

  describe('sanitizeParams', () => {
    it('clamps and rounds int values, preventing exceeding max', () => {
      // 53 exceeds max 50 -> clamped to 50
      const { params, warnings } = sanitizeParams(dummyModule, { itemCount: 53 });
      expect(params.itemCount).toBe(50);
      expect(warnings.length).toBeGreaterThan(0);

      // 12 rounds to nearest step (min: 10, step: 5) -> 10
      const res2 = sanitizeParams(dummyModule, { itemCount: 12 });
      expect(res2.params.itemCount).toBe(10);

      // 13 rounds to 15
      const res3 = sanitizeParams(dummyModule, { itemCount: 13 });
      expect(res3.params.itemCount).toBe(15);
    });

    it('validates select values and falls back to default on invalid choice', () => {
      const { params, warnings } = sanitizeParams(dummyModule, {
        difficulty: 'super-hard' as any,
      });
      expect(params.difficulty).toBe('easy');
      expect(warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
    });

    it('normalizes multi values to option definition order and checks minSelected', () => {
      // Given unordered elements
      const res1 = sanitizeParams(dummyModule, {
        categories: ['stationery', 'food'],
      });
      expect(res1.params.categories).toEqual(['food', 'stationery']);

      // Less than minSelected (empty) -> falls back to default
      const res2 = sanitizeParams(dummyModule, { categories: [] });
      expect(res2.params.categories).toEqual(['food']);
      expect(res2.warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
    });

    it('normalizes charSet by alphabet order, uniqueness, and min/max constraints', () => {
      // Input: 'おあうあ' -> unique 'あ','う','お' in alphabet order 'あいうえお'
      const res1 = sanitizeParams(dummyModule, { customLetters: 'おあうあ' });
      expect(res1.params.customLetters).toBe('あうお');

      // Exceeds maxCount (3) -> trimmed to 3
      const res2 = sanitizeParams(dummyModule, { customLetters: 'えおあう' });
      expect(res2.params.customLetters).toBe('あうえ'); // first 3 in alphabet order

      // Invalid chars only -> falls back to default
      const res3 = sanitizeParams(dummyModule, { customLetters: 'かきく' });
      expect(res3.params.customLetters).toBe('あい');
    });

    it('sanitizes common params (textScale, strokeScale)', () => {
      const res = sanitizeParams(dummyModule, { textScale: 250, strokeScale: 70 });
      expect(res.params.textScale).toBe(200); // max 200
      expect(res.params.strokeScale).toBe(100); // min 100
    });
  });

  describe('isFieldVisible', () => {
    const charSetField = dummyModule.paramSchema[4]!;

    it('returns true when visibleWhen condition is satisfied', () => {
      expect(isFieldVisible(charSetField, { difficulty: 'hard' })).toBe(true);
    });

    it('returns false when visibleWhen condition is not satisfied', () => {
      expect(isFieldVisible(charSetField, { difficulty: 'easy' })).toBe(false);
    });
  });
});
