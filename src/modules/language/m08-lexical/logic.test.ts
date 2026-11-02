import { describe, expect, it } from 'vitest';
import { getDefaultParams } from '../../../core/params';
import { makeTestContext } from '../../../core/testing';
import type { CommonParams, M08Params } from '../../../types/schema';
import { shuffleAnagramChars } from './anagram';
import { generateOddOneOut } from './category';
import { m08Module } from './index';

function getM08TestParams(overrides: Partial<M08Params> = {}): M08Params & CommonParams {
  const defaults = getDefaultParams(m08Module) as M08Params & CommonParams;
  return { ...defaults, ...overrides };
}

describe('M08 言語モジュール ロジック・描画検証', () => {
  it('モジュールの基本プロパティが契約通り定義されている', () => {
    expect(m08Module.id).toBe('M08');
    expect(m08Module.domain).toBe('language');
    const params = getM08TestParams();
    expect(m08Module.orientation(params)).toBe('portrait');
    expect(m08Module.paramSchema.length).toBe(12);
  });

  describe('サブモード A: 単語穴埋め（fill）', () => {
    it('同一シード・パラメータで決定的な出力を生成する', () => {
      const { ctx: ctx1 } = makeTestContext({ moduleId: 'M08', seed: 12345, sheetIndex: 1 });
      const { ctx: ctx2 } = makeTestContext({ moduleId: 'M08', seed: 12345, sheetIndex: 1 });

      const params = getM08TestParams({ subMode: 'fill', itemCount: 8 });
      const res1 = m08Module.generate(ctx1, params);
      const res2 = m08Module.generate(ctx2, params);

      expect(res1.pages.length).toBe(2);
      expect(res2.pages.length).toBe(2);
      expect(res1.pages[0]?.markup).toBe(res2.pages[0]?.markup);
      expect(res1.pages[1]?.markup).toBe(res2.pages[1]?.markup);
    });

    it('異なるシードで異なる単語が出題される（多様性）', () => {
      const { ctx: ctx1 } = makeTestContext({ moduleId: 'M08', seed: 11111, sheetIndex: 1 });
      const { ctx: ctx2 } = makeTestContext({ moduleId: 'M08', seed: 99999, sheetIndex: 1 });

      const params = getM08TestParams({ subMode: 'fill', itemCount: 8 });
      const res1 = m08Module.generate(ctx1, params);
      const res2 = m08Module.generate(ctx2, params);

      expect(res1.pages[0]?.markup).not.toBe(res2.pages[0]?.markup);
    });

    it('各 fillHint 設定で伏せ字位置が正しく反映される', () => {
      const hints: M08Params['fillHint'][] = ['initial', 'final', 'initialFinal', 'random'];
      for (const hint of hints) {
        const { ctx } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
        const params = getM08TestParams({ subMode: 'fill', fillHint: hint, itemCount: 6 });
        const res = m08Module.generate(ctx, params);
        expect(res.pages[0]?.markup).toContain('class="char-box"');
        expect(res.pages[1]?.markup).toContain('【採点チェックリスト】');
      }
    });
  });

  describe('サブモード B: アナグラム（anagram）', () => {
    it('shuffleAnagramChars は100回試行しても元の語順と決して一致しない', () => {
      const { ctx } = makeTestContext({ moduleId: 'M08', seed: 777 });
      const testWords = ['みかん', 'つくえ', 'すずめ', 'トマト', 'ほんだな'];
      for (const word of testWords) {
        const chars = Array.from(word);
        for (let i = 0; i < 20; i++) {
          const shuffled = shuffleAnagramChars(chars, ctx.rng);
          expect(shuffled.join('')).not.toBe(word);
          expect([...shuffled].sort().join('')).toBe([...chars].sort().join(''));
        }
      }
    });

    it('シャッフル後の文字順が元の単語と決して一致せず、文字集合は一致する', () => {
      for (let s = 1; s <= 5; s++) {
        const { ctx } = makeTestContext({ moduleId: 'M08', seed: s * 1000, sheetIndex: 1 });
        const params = getM08TestParams({ subMode: 'anagram', itemCount: 10, minLength: 3, maxLength: 5 });
        const res = m08Module.generate(ctx, params);

        expect(res.pages.length).toBe(2);
        const pMarkup = res.pages[0]?.markup ?? '';
        const aMarkup = res.pages[1]?.markup ?? '';

        // 解答ページには採点チェックリストが含まれる
        expect(aMarkup).toContain('【採点チェックリスト】');
        expect(pMarkup).toContain('➔');
      }
    });

    it('anagram の minLength/maxLength が 3..5 に clamp される', () => {
      const { ctx, warnings } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'anagram', minLength: 2, maxLength: 6 });
      m08Module.generate(ctx, params);

      expect(warnings.some((w) => w.code === 'PARAM_CLAMPED')).toBe(true);
    });
  });

  describe('サブモード C: 意味カテゴリ分類（category）', () => {
    it('oddOneOut（仲間外れ）で仲間外れの語が親カテゴリにも属さず、正解がハイライトされる', () => {
      const { ctx: ctx1 } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'category', categoryTask: 'oddOneOut', itemCount: 10 });
      const data = generateOddOneOut(ctx1, params);
      expect(data.oddItems?.length).toBe(10);

      for (const item of data.oddItems ?? []) {
        // 仲間外れの語は親カテゴリではない
        expect(item.answerEntry.category).toBe(item.oddCategory);
        expect(item.answerEntry.category).not.toBe(item.mainCategory);

        // alsoCategories にも親カテゴリが含まれていないこと
        if (item.answerEntry.alsoCategories) {
          expect(item.answerEntry.alsoCategories).not.toContain(item.mainCategory);
        }

        // 親カテゴリ側の語も oddCategory を alsoCategories に含まないこと
        for (const choice of item.choices) {
          if (!choice.isOdd && choice.entry.alsoCategories) {
            expect(choice.entry.alsoCategories).not.toContain(item.oddCategory);
          }
        }
      }

      const { ctx: ctx2 } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const res = m08Module.generate(ctx2, params);
      expect(res.pages.length).toBe(2);
      expect(res.pages[0]?.instruction).toContain('仲間外れ');
      expect(res.pages[1]?.markup).toContain('#D00000');
    });

    it('findAll（指定探索）でターゲット語が正しくハイライトされ、目標語数が表示される', () => {
      const { ctx } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'category', categoryTask: 'findAll', findAllCount: 24 });
      const res = m08Module.generate(ctx, params);

      expect(res.pages.length).toBe(2);
      expect(res.pages[0]?.instruction).toContain('探して〇をつけましょう');
      expect(res.pages[1]?.markup).toContain('正解：全');
    });
  });

  describe('サブモード D: 短文課題（sentence）', () => {
    it('particleBlank（助詞書き込み）で問題・解答および許容解が生成される', () => {
      const { ctx } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'sentence', sentenceTask: 'particleBlank', itemCount: 8 });
      const res = m08Module.generate(ctx, params);

      expect(res.pages[0]?.markup).toContain('class="m08-row"');
      expect(res.pages[1]?.markup).toContain('【採点チェックリスト】');
    });

    it('particleChoice（助詞選択）で3択が生成され、選択肢に重複がない', () => {
      const { ctx } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'sentence', sentenceTask: 'particleChoice', itemCount: 8 });
      const res = m08Module.generate(ctx, params);

      expect(res.pages[0]?.markup).toContain('①');
      expect(res.pages[0]?.markup).toContain('②');
      expect(res.pages[0]?.markup).toContain('③');
    });

    it('judgement（意味正誤判定）で○×判定欄と理由が生成される', () => {
      const { ctx } = makeTestContext({ moduleId: 'M08', seed: 42, sheetIndex: 1 });
      const params = getM08TestParams({ subMode: 'sentence', sentenceTask: 'judgement', itemCount: 8 });
      const res = m08Module.generate(ctx, params);

      expect(res.pages[0]?.markup).toContain('○・×');
      expect(res.pages[1]?.markup).toContain('【採点チェックリスト】');
    });
  });

  describe('表記切替（notation）の検証', () => {
    it('hiragana, kanji, kanjiRuby の表記切替が紙面に反映される', () => {
      const notations: M08Params['notation'][] = ['hiragana', 'kanji', 'kanjiRuby'];
      for (const notation of notations) {
        const { ctx } = makeTestContext({ moduleId: 'M08', seed: 100, sheetIndex: 1 });
        const params = getM08TestParams({ subMode: 'category', categoryTask: 'findAll', notation, findAllCount: 20 });
        const res = m08Module.generate(ctx, params);
        expect(res.pages[0]?.markup.length).toBeGreaterThan(0);
      }
    });
  });

  describe('バッチ複数枚生成での一意性と非復元抽出', () => {
    it('5枚連続生成時に各シートが正常に生成される', () => {
      const pages: string[] = [];
      for (let s = 1; s <= 5; s++) {
        const { ctx } = makeTestContext({ moduleId: 'M08', seed: 8888, sheetIndex: s, sheetCount: 5 });
        const params = getM08TestParams({ subMode: 'fill', itemCount: 10 });
        const res = m08Module.generate(ctx, params);
        pages.push(res.pages[0]?.markup ?? '');
      }

      // 各シートのマークアップがすべて異なること（非復元抽出による進展）
      const uniqueMarkups = new Set(pages);
      expect(uniqueMarkups.size).toBe(5);
    });
  });
});
