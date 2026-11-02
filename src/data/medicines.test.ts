/**
 * 服薬管理マスターデータ整合性テスト
 * ARCHITECTURE.md §5.6, §9.7, DATA_MINIMUMS 準拠
 */

import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS, DOSE_TIMINGS } from '../types/schema';
import { MEDICINE_TEMPLATES } from './medicines';

describe('src/data/medicines master data integrity', () => {
  it('has at least DATA_MINIMUMS.medicines items', () => {
    expect(MEDICINE_TEMPLATES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.medicines);
  });

  it('has unique IDs', () => {
    const ids = new Set(MEDICINE_TEMPLATES.map((m) => m.id));
    expect(ids.size).toBe(MEDICINE_TEMPLATES.length);
  });

  it('has unique fictionalNames and format complies with rules', () => {
    const names = new Set(MEDICINE_TEMPLATES.map((m) => m.fictionalName));
    expect(names.size).toBe(MEDICINE_TEMPLATES.length);

    const katakanaRegex = /^[\u30A0-\u30FFー]+$/;

    for (const m of MEDICINE_TEMPLATES) {
      // カタカナのみ（長音符含む）
      expect(katakanaRegex.test(m.fictionalName), `${m.fictionalName} must be katakana`).toBe(true);
      // 「錠」「カプセル」を含まない
      expect(m.fictionalName).not.toContain('錠');
      expect(m.fictionalName).not.toContain('カプセル');
      // 文字長が4〜9文字
      expect(m.fictionalName.length).toBeGreaterThanOrEqual(4);
      expect(m.fictionalName.length).toBeLessThanOrEqual(9);
      // 効能が非空
      expect(m.effect.length).toBeGreaterThan(0);
      // 剤形が '錠' または 'カプセル'
      expect(m.form === '錠' || m.form === 'カプセル').toBe(true);
    }
  });

  it('has valid timingPatterns and doseOptions', () => {
    const validTimingsSet = new Set(DOSE_TIMINGS);

    for (const m of MEDICINE_TEMPLATES) {
      expect(m.timingPatterns.length).toBeGreaterThanOrEqual(1);

      for (const pattern of m.timingPatterns) {
        expect(pattern.length).toBeGreaterThanOrEqual(1);
        expect(pattern.length).toBeLessThanOrEqual(4);

        // 重複なし
        const pSet = new Set(pattern);
        expect(pSet.size).toBe(pattern.length);

        // DOSE_TIMINGS の有効な値
        for (const t of pattern) {
          expect(validTimingsSet.has(t)).toBe(true);
        }
      }

      // doseOptions は 1 または 2 のみ
      expect(m.doseOptions.length).toBeGreaterThanOrEqual(1);
      for (const opt of m.doseOptions) {
        expect(opt === 1 || opt === 2).toBe(true);
      }
    }
  });

  it('ensures sleeping pills have bedtime timings', () => {
    const sleepMeds = MEDICINE_TEMPLATES.filter(
      (m) => m.effect.includes('眠り') || m.effect.includes('寝つき')
    );
    expect(sleepMeds.length).toBeGreaterThanOrEqual(2);
    for (const sm of sleepMeds) {
      for (const pattern of sm.timingPatterns) {
        expect(pattern).toContain('bedtime');
      }
    }
  });
});
