/**
 * 全マスターデータ最低収録件数・品質基準の一括検証テスト
 * ARCHITECTURE.md §10 準拠
 * TASKS.md Task 77
 */

import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS, VOCAB_CATEGORY_IDS } from '../types/schema';
import { MEDICINE_TEMPLATES } from './medicines';
import { PASSAGES } from './passages';
import { CALENDAR_EVENT_TEMPLATES } from './schedule/calendar-events';
import { ERRAND_TEMPLATES, ORDER_PAIR_TEMPLATES } from './schedule/errands';
import { JUDGEMENT_SENTENCES } from './sentences/judgement';
import { PARTICLE_SENTENCES } from './sentences/particle';
import { SHOP_ITEMS } from './shop-items';
import { getCancellationSymbols, getSdmtSymbols, SYMBOLS } from './symbols';
import { VOCABULARY } from './vocabulary';

describe('Task 77: 全マスターデータ最低収録件数・品質基準の一括検証テスト', () => {
  describe('DATA_MINIMUMS の最低収録件数一括検証', () => {
    it(`語彙データ: 総数 ${DATA_MINIMUMS.vocabulary} 語以上かつ各カテゴリ ${DATA_MINIMUMS.vocabPerCategory} 語以上`, () => {
      expect(VOCABULARY.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.vocabulary);

      for (const cat of VOCAB_CATEGORY_IDS) {
        const count = VOCABULARY.filter((v) => v.category === cat).length;
        expect(count).toBeGreaterThanOrEqual(DATA_MINIMUMS.vocabPerCategory);
      }
    });

    it(`読解コーパス: ${DATA_MINIMUMS.passages} 編以上`, () => {
      expect(PASSAGES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.passages);
    });

    it(`助詞補充短文: ${DATA_MINIMUMS.particleSentences} 文以上`, () => {
      expect(PARTICLE_SENTENCES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.particleSentences);
    });

    it(`意味正誤判定短文: ${DATA_MINIMUMS.judgementSentences} 文以上`, () => {
      expect(JUDGEMENT_SENTENCES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.judgementSentences);
    });

    it(`買い物商品: ${DATA_MINIMUMS.shopItems} 品目以上`, () => {
      expect(SHOP_ITEMS.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.shopItems);
    });

    it(`スケジュール用事: ${DATA_MINIMUMS.errands} 件以上`, () => {
      expect(ERRAND_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.errands);
    });

    it(`スケジュール順序ペア: ${DATA_MINIMUMS.orderPairs} 件以上`, () => {
      expect(ORDER_PAIR_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.orderPairs);
    });

    it(`カレンダー予定: ${DATA_MINIMUMS.calendarEvents} 件以上`, () => {
      expect(CALENDAR_EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.calendarEvents);
    });

    it(`架空薬剤: ${DATA_MINIMUMS.medicines} 種以上`, () => {
      expect(MEDICINE_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.medicines);
    });

    it(`抹消幾何学記号: ${DATA_MINIMUMS.cancellationSymbols} 種以上`, () => {
      expect(getCancellationSymbols().length).toBeGreaterThanOrEqual(
        DATA_MINIMUMS.cancellationSymbols,
      );
    });

    it(`符号変換幾何学記号: ${DATA_MINIMUMS.sdmtSymbols} 種以上`, () => {
      expect(getSdmtSymbols().length).toBeGreaterThanOrEqual(DATA_MINIMUMS.sdmtSymbols);
    });
  });

  describe('データ品質・省略禁止・未完成文字列ゼロの一括検証', () => {
    const PROHIBITED_WORDS = ['TODO', 'FIXME', '以下同様', 'ダミー', '...'];

    // 全マスターデータを再帰的に走査して文字列フィールドを抽出
    function extractAllStrings(val: unknown): string[] {
      if (typeof val === 'string') {
        return [val];
      }
      if (Array.isArray(val)) {
        return val.flatMap(extractAllStrings);
      }
      if (val !== null && typeof val === 'object') {
        return Object.values(val).flatMap(extractAllStrings);
      }
      return [];
    }

    const ALL_DATA_SETS = [
      { name: 'VOCABULARY', data: VOCABULARY },
      { name: 'PASSAGES', data: PASSAGES },
      { name: 'PARTICLE_SENTENCES', data: PARTICLE_SENTENCES },
      { name: 'JUDGEMENT_SENTENCES', data: JUDGEMENT_SENTENCES },
      { name: 'SHOP_ITEMS', data: SHOP_ITEMS },
      { name: 'ERRAND_TEMPLATES', data: ERRAND_TEMPLATES },
      { name: 'ORDER_PAIR_TEMPLATES', data: ORDER_PAIR_TEMPLATES },
      { name: 'CALENDAR_EVENT_TEMPLATES', data: CALENDAR_EVENT_TEMPLATES },
      { name: 'MEDICINE_TEMPLATES', data: MEDICINE_TEMPLATES },
      { name: 'SYMBOLS', data: SYMBOLS },
    ];

    for (const { name, data } of ALL_DATA_SETS) {
      it(`[${name}] 省略・TODO・ダミー・三点リーダー文字列が一切含まれていないこと`, () => {
        const strings = extractAllStrings(data);
        expect(strings.length).toBeGreaterThan(0);

        for (const str of strings) {
          for (const prohibited of PROHIBITED_WORDS) {
            expect(
              str.includes(prohibited),
              `データセット ${name} 内の文字列 "${str}" に禁止語 "${prohibited}" が含まれています`,
            ).toBe(false);
          }
        }
      });
    }

    it('全マスターデータのエントリ ID が各データセット内で一意であること', () => {
      function checkIdUniqueness<T extends { readonly id: string }>(name: string, items: readonly T[]) {
        const ids = new Set<string>();
        for (const item of items) {
          expect(ids.has(item.id), `重複したIDが見つかりました: [${name}] ${item.id}`).toBe(false);
          ids.add(item.id);
        }
      }

      checkIdUniqueness('VOCABULARY', VOCABULARY);
      checkIdUniqueness('PASSAGES', PASSAGES);
      checkIdUniqueness('PARTICLE_SENTENCES', PARTICLE_SENTENCES);
      checkIdUniqueness('JUDGEMENT_SENTENCES', JUDGEMENT_SENTENCES);
      checkIdUniqueness('SHOP_ITEMS', SHOP_ITEMS);
      checkIdUniqueness('ERRAND_TEMPLATES', ERRAND_TEMPLATES);
      checkIdUniqueness('ORDER_PAIR_TEMPLATES', ORDER_PAIR_TEMPLATES);
      checkIdUniqueness('CALENDAR_EVENT_TEMPLATES', CALENDAR_EVENT_TEMPLATES);
      checkIdUniqueness('MEDICINE_TEMPLATES', MEDICINE_TEMPLATES);
      checkIdUniqueness('SYMBOLS', SYMBOLS);
    });
  });
});
