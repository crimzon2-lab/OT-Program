import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS, VOCAB_CATEGORY_IDS } from '../../types/schema';
import { VOCAB_CATEGORIES, VOCAB_CATEGORY_MAP, VOCABULARY } from './index';

describe('語彙マスターデータ（VOCABULARY）の整合性検証', () => {
  it('全語彙数が DATA_MINIMUMS.vocabulary（240語以上）を満たす', () => {
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.vocabulary);
  });

  it('全12カテゴリが定義され、VOCAB_CATEGORY_IDS の全件に対応する', () => {
    expect(VOCAB_CATEGORIES.length).toBe(12);
    for (const catId of VOCAB_CATEGORY_IDS) {
      expect(VOCAB_CATEGORY_MAP[catId]).toBeDefined();
      expect(VOCAB_CATEGORY_MAP[catId].id).toBe(catId);
      expect(VOCAB_CATEGORY_MAP[catId].label.length).toBeGreaterThan(0);
      expect(VOCAB_CATEGORY_MAP[catId].hintPhrase.length).toBeGreaterThan(0);
      expect(VOCAB_CATEGORY_MAP[catId].findAllPhrase.length).toBeGreaterThan(0);
    }
  });

  it('全12カテゴリそれぞれが DATA_MINIMUMS.vocabPerCategory（20語以上）を満たし、3〜5文字の語を12語以上含む', () => {
    for (const catId of VOCAB_CATEGORY_IDS) {
      const entries = VOCABULARY.filter((v) => v.category === catId);
      expect(entries.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.vocabPerCategory);

      const len3to5 = entries.filter((v) => v.kanaLength >= 3 && v.kanaLength <= 5);
      expect(len3to5.length).toBeGreaterThanOrEqual(12);
    }
  });

  it('全エントリの ID が一意である（重複ゼロ）', () => {
    const ids = VOCABULARY.map((v) => v.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('全エントリの kana が一意である（同音異義語・重複ゼロ）', () => {
    const kanas = VOCABULARY.map((v) => v.kana);
    const uniqueKanas = new Set(kanas);
    expect(uniqueKanas.size).toBe(kanas.length);
  });

  it('全エントリの kanaLength が Array.from(kana.normalize("NFC")).length と完全一致する', () => {
    for (const entry of VOCABULARY) {
      const codePointLength = Array.from(entry.kana.normalize('NFC')).length;
      expect(entry.kanaLength).toBe(codePointLength);
    }
  });

  it('全エントリの hint が適切に設定されている（8〜35文字、空でない、答えの kanji や 3 文字以上の kana を含まない）', () => {
    for (const entry of VOCABULARY) {
      expect(entry.hint.length).toBeGreaterThanOrEqual(8);
      expect(entry.hint.length).toBeLessThanOrEqual(35);

      // 答えの kanji（2文字以上の漢字表記）がヒント文にそのまま含まれていないこと
      if (entry.kanji.length >= 2 && entry.kanji !== entry.kana) {
        expect(entry.hint).not.toContain(entry.kanji);
      }

      // 答えの kana（3文字以上の場合）がヒント文にそのまま含まれていないこと
      if (entry.kana.length >= 3) {
        expect(entry.hint).not.toContain(entry.kana);
      }
    }
  });

  it('臨床的配慮：不穏・心理的負担を与える語彙（死・病気・怪我・事故・認知症・入院等）が含まれていない', () => {
    const forbiddenWords = ['死', '病気', 'ケガ', '怪我', '事故', '認知症', '入院', '注射', '薬物', '血液'];
    for (const entry of VOCABULARY) {
      for (const word of forbiddenWords) {
        expect(entry.kanji).not.toContain(word);
        expect(entry.hint).not.toContain(word);
      }
    }
  });
});
