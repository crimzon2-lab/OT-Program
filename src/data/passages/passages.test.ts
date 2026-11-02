import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS, type PassageTheme } from '../../types/schema';
import { PASSAGES } from './index';

describe('読解コーパスマスターデータ (PASSAGES)', () => {
  it('最低収録件数（18編）を満たし、IDが一意で昇順であること', () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.passages);

    const ids = PASSAGES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (let i = 0; i < PASSAGES.length; i++) {
      const expectedId = `pa-${String(i + 1).padStart(3, '0')}`;
      expect(PASSAGES[i]!.id).toBe(expectedId);
    }
  });

  it('6テーマ（season, lifeTips, episode, food, health, local）が各3編ずつ均等に収録されていること', () => {
    const expectedThemes: PassageTheme[] = [
      'season',
      'lifeTips',
      'episode',
      'food',
      'health',
      'local',
    ];

    const counts = new Map<PassageTheme, number>();
    for (const p of PASSAGES) {
      counts.set(p.theme, (counts.get(p.theme) ?? 0) + 1);
    }

    for (const theme of expectedThemes) {
      expect(counts.get(theme)).toBe(3);
    }
  });

  it('全編の kanaText が文字種規約を満たし、不正なスペースが存在しないこと', () => {
    for (const p of PASSAGES) {
      const text = p.kanaText;

      // 使用可能文字：ひらがな（ぁ〜ゖ）、長音「ー」、読点「、」、句点「。」、半角スペースのみ
      expect(text).toMatch(/^[ぁ-ゖー、。 ]+$/);

      // 先頭・末尾のスペース禁止
      expect(text.startsWith(' ')).toBe(false);
      expect(text.endsWith(' ')).toBe(false);

      // 連続スペース禁止
      expect(text).not.toContain('  ');

      // 句読点の直前スペース禁止（スペース除去時に自然なベタ組み文になること）
      expect(text).not.toContain(' 、');
      expect(text).not.toContain(' 。');
    }
  });

  it('全編のスペース除外文字数が 180〜300 文字の範囲内であること', () => {
    for (const p of PASSAGES) {
      const noSpace = p.kanaText.replace(/ /g, '');
      expect(noSpace.length).toBeGreaterThanOrEqual(180);
      expect(noSpace.length).toBeLessThanOrEqual(300);
    }
  });

  it('清音の5母音（あ、い、う、え、お）が各編に最低2文字以上含まれ、合計30文字以上であること', () => {
    const vowels = ['あ', 'い', 'う', 'え', 'お'] as const;

    for (const p of PASSAGES) {
      const noSpace = p.kanaText.replace(/ /g, '');
      let vowelSum = 0;

      for (const v of vowels) {
        const count = (noSpace.match(new RegExp(v, 'g')) || []).length;
        expect(count).toBeGreaterThanOrEqual(2);
        vowelSum += count;
      }

      expect(vowelSum).toBeGreaterThanOrEqual(30);
    }
  });

  it('全編の内容確認3択問題がちょうど3問あり、選択肢が重複せず、正答インデックスが有効であること', () => {
    const answerCounts = { 0: 0, 1: 0, 2: 0 };

    for (const p of PASSAGES) {
      expect(p.questions.length).toBe(3);

      for (const q of p.questions) {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.choices.length).toBe(3);

        for (const choice of q.choices) {
          expect(choice.trim().length).toBeGreaterThan(0);
        }

        // 3つの選択肢が互いに異なること
        const uniqueChoices = new Set(q.choices);
        expect(uniqueChoices.size).toBe(3);

        // 正答インデックスが 0, 1, 2 のいずれかであること
        expect([0, 1, 2]).toContain(q.answerIndex);
        answerCounts[q.answerIndex]++;
      }
    }

    // 全18編（計54問）全体で 0, 1, 2 が偏りなく分布していること（各15問以上）
    expect(answerCounts[0]).toBeGreaterThanOrEqual(15);
    expect(answerCounts[1]).toBeGreaterThanOrEqual(15);
    expect(answerCounts[2]).toBeGreaterThanOrEqual(15);
  });
});
