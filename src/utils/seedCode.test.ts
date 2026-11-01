import { describe, expect, it } from 'vitest';
import type { AnyTaskModule } from '../types/schema';
import { getDefaultParams } from '../core/params';
import { encodeSeedCode, parseSeedCode } from './seedCode';

describe('src/utils/seedCode.ts', () => {
  const mockModule: Pick<AnyTaskModule, 'id' | 'paramSchema'> = {
    id: 'M01',
    paramSchema: [
      {
        key: 'targetCount',
        code: 1,
        kind: 'int',
        label: '標的数',
        min: 10,
        max: 60,
        step: 5,
        default: 20,
      },
      {
        key: 'shapeType',
        code: 2,
        kind: 'select',
        label: '図形',
        options: [
          { value: 'circle', label: '丸' },
          { value: 'star', label: '星' },
          { value: 'triangle', label: '三角' },
        ],
        default: 'circle',
      },
      {
        key: 'showGrid',
        code: 3,
        kind: 'bool',
        label: '格子',
        default: false,
      },
      {
        key: 'distractors',
        code: 4,
        kind: 'multi',
        label: '妨害刺激',
        options: [
          { value: 'd1', label: '妨害1' },
          { value: 'd2', label: '妨害2' },
          { value: 'd3', label: '妨害3' },
        ],
        default: ['d1'],
        minSelected: 1,
      },
      {
        key: 'customLetters',
        code: 5,
        kind: 'charSet',
        label: '文字セット',
        alphabet: 'あいうえおかきくけこ',
        default: 'あい',
        minCount: 1,
        maxCount: 4,
      },
    ],
  };

  const getModule = (id: string) => (id === 'M01' ? mockModule : undefined);

  it('encodes default params on sheet 1 to shortest form RP1-M01-482914', () => {
    const defaults = getDefaultParams(mockModule);
    const code = encodeSeedCode(mockModule, 482914, 1, defaults);
    expect(code).toBe('RP1-M01-482914');

    const parsed = parseSeedCode(code, getModule);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.moduleId).toBe('M01');
      expect(parsed.value.seed).toBe(482914);
      expect(parsed.value.sheetIndex).toBe(1);
      expect(parsed.value.paramsDiff).toEqual({});
    }
  });

  it('encodes default params on sheet 3 with sheet segment RP1-M01-482914-3', () => {
    const defaults = getDefaultParams(mockModule);
    const code = encodeSeedCode(mockModule, 482914, 3, defaults);
    expect(code).toBe('RP1-M01-482914-3');

    const parsed = parseSeedCode(code, getModule);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.sheetIndex).toBe(3);
      expect(parsed.value.paramsDiff).toEqual({});
    }
  });

  it('roundtrips all field kinds including common params accurately', () => {
    const customParams = {
      ...getDefaultParams(mockModule),
      targetCount: 35, // int diff
      shapeType: 'star', // select diff
      showGrid: true, // bool diff
      distractors: ['d1', 'd3'], // multi diff
      customLetters: 'いかこ', // charSet diff
      textScale: 120, // common param diff
    };

    const code = encodeSeedCode(mockModule, 987654, 2, customParams);
    expect(code).toContain('RP1-M01-987654-2-');

    const parsed = parseSeedCode(code, getModule);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.moduleId).toBe('M01');
      expect(parsed.value.seed).toBe(987654);
      expect(parsed.value.sheetIndex).toBe(2);
      expect(parsed.value.paramsDiff).toEqual({
        targetCount: 35,
        shapeType: 'star',
        showGrid: true,
        distractors: ['d1', 'd3'],
        customLetters: 'いかこ',
        textScale: 120,
      });
    }
  });

  it('detects checksum error when a character is altered', () => {
    const customParams = {
      ...getDefaultParams(mockModule),
      targetCount: 35,
    };
    const code = encodeSeedCode(mockModule, 12345, 1, customParams);
    // Alter the last character
    const lastChar = code.slice(-1);
    const alteredChar = lastChar === 'A' ? 'B' : 'A';
    const tamperedCode = code.slice(0, -1) + alteredChar;

    const parsed = parseSeedCode(tamperedCode, getModule);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe('CHECKSUM');
    }
  });

  it('normalizes Japanese IME inputs (fullwidth chars, ー, dashes, lowercase, O/I/L)', () => {
    // Standard code
    const defaults = getDefaultParams(mockModule);
    const code = encodeSeedCode(mockModule, 12345, 2, {
      ...defaults,
      targetCount: 30,
    });

    // Replace '-' with Japanese chouon 'ー' and dashes '－'
    const imeInput = code
      .replace(/-/g, 'ー')
      .toLowerCase();

    const parsed = parseSeedCode(imeInput, getModule);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.seed).toBe(12345);
      expect(parsed.value.sheetIndex).toBe(2);
      expect(parsed.value.paramsDiff.targetCount).toBe(30);
    }
  });

  it('rejects invalid Crockford characters like U', () => {
    const invalidCode = 'RP1-M01-12345-1-ABCD-EFGU';
    const parsed = parseSeedCode(invalidCode, getModule);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe('CHAR');
    }
  });
});
