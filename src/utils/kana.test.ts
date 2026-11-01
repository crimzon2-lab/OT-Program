import { describe, expect, it } from 'vitest';
import {
  classifyKana,
  countTargets,
  dakuonVariantsOf,
  isKanaTarget,
  katakanaToHiragana,
  toCodePoints,
} from './kana';

describe('src/utils/kana.ts', () => {
  it('toCodePoints decomposes strings by NFC code points', () => {
    expect(toCodePoints('あい')).toEqual(['あ', 'い']);
    // NFD string decomposed
    expect(toCodePoints('か\u3099')).toEqual(['が']);
  });

  it('katakanaToHiragana converts katakana to hiragana', () => {
    expect(katakanaToHiragana('ア')).toBe('あ');
    expect(katakanaToHiragana('ン')).toBe('ん');
    expect(katakanaToHiragana('あ')).toBe('あ');
    expect(katakanaToHiragana('1')).toBe('1');
  });

  describe('classifyKana', () => {
    it('classifies seion correctly', () => {
      const info = classifyKana('あ');
      expect(info).toEqual({
        char: 'あ',
        script: 'hiragana',
        base: 'あ',
        voicing: 'seion',
        isSmall: false,
      });
    });

    it('classifies dakuon correctly', () => {
      const info = classifyKana('が');
      expect(info).toEqual({
        char: 'が',
        script: 'hiragana',
        base: 'か',
        voicing: 'dakuon',
        isSmall: false,
      });
    });

    it('classifies ゔ as dakuon with base う', () => {
      const info = classifyKana('ゔ');
      expect(info).toEqual({
        char: 'ゔ',
        script: 'hiragana',
        base: 'う',
        voicing: 'dakuon',
        isSmall: false,
      });
    });

    it('classifies handakuon correctly', () => {
      const info = classifyKana('ぱ');
      expect(info).toEqual({
        char: 'ぱ',
        script: 'hiragana',
        base: 'は',
        voicing: 'handakuon',
        isSmall: false,
      });
    });

    it('classifies small kana correctly', () => {
      const info = classifyKana('ぁ');
      expect(info).toEqual({
        char: 'ぁ',
        script: 'hiragana',
        base: 'あ',
        voicing: 'seion',
        isSmall: true,
      });
    });

    it('classifies katakana correctly', () => {
      const info = classifyKana('カ');
      expect(info).toEqual({
        char: 'カ',
        script: 'katakana',
        base: 'か',
        voicing: 'seion',
        isSmall: false,
      });
    });

    it('classifies other symbols correctly', () => {
      const info = classifyKana('A');
      expect(info).toEqual({
        char: 'A',
        script: 'other',
        base: 'A',
        voicing: 'none',
        isSmall: false,
      });
    });
  });

  describe('isKanaTarget (ARCHITECTURE.md §5.4 12 cases)', () => {
    it('1. か / targets: か -> true (清音一致)', () => {
      expect(isKanaTarget('か', { targets: 'か', includeSmall: false })).toBe(true);
    });

    it('2. が / targets: か -> false (濁音)', () => {
      expect(isKanaTarget('が', { targets: 'か', includeSmall: false })).toBe(false);
    });

    it('3. ぱ / targets: は -> false (半濁音)', () => {
      expect(isKanaTarget('ぱ', { targets: 'は', includeSmall: false })).toBe(false);
    });

    it('4. ば / targets: は -> false (濁音)', () => {
      expect(isKanaTarget('ば', { targets: 'は', includeSmall: false })).toBe(false);
    });

    it('5. ぁ / targets: あ (includeSmall: false) -> false (小書き除外)', () => {
      expect(isKanaTarget('ぁ', { targets: 'あ', includeSmall: false })).toBe(false);
    });

    it('6. ぁ / targets: あ (includeSmall: true) -> true (小書き許可)', () => {
      expect(isKanaTarget('ぁ', { targets: 'あ', includeSmall: true })).toBe(true);
    });

    it('7. っ / targets: つ -> false when includeSmall: false, true when includeSmall: true (促音)', () => {
      expect(isKanaTarget('っ', { targets: 'つ', includeSmall: false })).toBe(false);
      expect(isKanaTarget('っ', { targets: 'つ', includeSmall: true })).toBe(true);
    });

    it('8. ゃ / targets: や -> false when includeSmall: false, true when includeSmall: true (拗音)', () => {
      expect(isKanaTarget('ゃ', { targets: 'や', includeSmall: false })).toBe(false);
      expect(isKanaTarget('ゃ', { targets: 'や', includeSmall: true })).toBe(true);
    });

    it('9. ゔ / targets: う -> false (濁音)', () => {
      expect(isKanaTarget('ゔ', { targets: 'う', includeSmall: false })).toBe(false);
    });

    it('10. ア / targets: あ -> false (カタカナ)', () => {
      expect(isKanaTarget('ア', { targets: 'あ', includeSmall: false })).toBe(false);
    });

    it('11. 記号類 (ー, 、, 。, ␠) / targets: あ -> false', () => {
      for (const ch of ['ー', '、', '。', ' ']) {
        expect(isKanaTarget(ch, { targets: 'あ', includeSmall: false })).toBe(false);
      }
    });

    it('12. NFD か\\u3099 / targets: か -> false (NFC正規化で「が」)', () => {
      expect(isKanaTarget('か\u3099', { targets: 'か', includeSmall: false })).toBe(false);
    });
  });

  describe('countTargets', () => {
    it('counts occurrences correctly', () => {
      const chars = ['か', 'が', 'き', 'か', 'ぁ', 'あ'];
      expect(countTargets(chars, { targets: 'か', includeSmall: false })).toBe(2);
      expect(countTargets(chars, { targets: 'あ', includeSmall: true })).toBe(2);
    });
  });

  describe('dakuonVariantsOf', () => {
    it('returns dakuon variants for seion', () => {
      expect(dakuonVariantsOf('か')).toEqual(['が']);
      expect(dakuonVariantsOf('は')).toEqual(['ば', 'ぱ']);
      expect(dakuonVariantsOf('う')).toEqual([]);
      expect(dakuonVariantsOf('あ')).toEqual([]);
      expect(dakuonVariantsOf('さ')).toEqual(['ざ']);
      expect(dakuonVariantsOf('た')).toEqual(['だ']);
    });
  });
});
