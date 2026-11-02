import { describe, expect, it } from 'vitest';
import { DATA_MINIMUMS, PARTICLES } from '../../types/schema';
import { JUDGEMENT_SENTENCES } from './judgement';
import { PARTICLE_SENTENCES } from './particle';

describe('短文マスターデータの整合性検証', () => {
  describe('助詞補充短文（PARTICLE_SENTENCES）', () => {
    it('件数が DATA_MINIMUMS.particleSentences（60文以上）を満たす', () => {
      expect(PARTICLE_SENTENCES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.particleSentences);
    });

    it('ID が一意である（重複ゼロ）', () => {
      const ids = PARTICLE_SENTENCES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('answer が PARTICLES のいずれかである', () => {
      for (const s of PARTICLE_SENTENCES) {
        expect(PARTICLES).toContain(s.answer);
      }
    });

    it('acceptable が answer と重複せず、すべて PARTICLES のいずれかである', () => {
      for (const s of PARTICLE_SENTENCES) {
        expect(s.acceptable).not.toContain(s.answer);
        for (const p of s.acceptable) {
          expect(PARTICLES).toContain(p);
        }
      }
    });

    it('distractors が2個あり、互いに異なり、answer や acceptable と重複しない', () => {
      for (const s of PARTICLE_SENTENCES) {
        expect(s.distractors.length).toBe(2);
        expect(s.distractors[0]).not.toBe(s.distractors[1]);
        expect(s.distractors).not.toContain(s.answer);
        for (const acc of s.acceptable) {
          expect(s.distractors).not.toContain(acc);
        }
      }
    });

    it('before と after が空でなく、文章として成立している', () => {
      for (const s of PARTICLE_SENTENCES) {
        expect(s.before.length).toBeGreaterThan(0);
        expect(s.after.length).toBeGreaterThan(0);
      }
    });
  });

  describe('意味正誤判定短文（JUDGEMENT_SENTENCES）', () => {
    it('件数が DATA_MINIMUMS.judgementSentences（60文以上）を満たす', () => {
      expect(JUDGEMENT_SENTENCES.length).toBeGreaterThanOrEqual(DATA_MINIMUMS.judgementSentences);
    });

    it('ID が一意である（重複ゼロ）', () => {
      const ids = JUDGEMENT_SENTENCES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('isValid: true が30文以上、isValid: false が30文以上含まれる', () => {
      const validCount = JUDGEMENT_SENTENCES.filter((s) => s.isValid).length;
      const invalidCount = JUDGEMENT_SENTENCES.filter((s) => !s.isValid).length;
      expect(validCount).toBeGreaterThanOrEqual(30);
      expect(invalidCount).toBeGreaterThanOrEqual(30);
    });

    it('全エントリに reason が記述されており、5文字以上である', () => {
      for (const s of JUDGEMENT_SENTENCES) {
        expect(s.reason.length).toBeGreaterThanOrEqual(5);
        expect(s.text.length).toBeGreaterThan(0);
      }
    });

    it('臨床的配慮：不穏・心理的負担を与える語彙（死・病気・怪我・事故・認知症・入院等）が含まれていない', () => {
      const forbiddenWords = ['死', '病気', 'ケガ', '怪我', '事故', '認知症', '入院', '注射', '薬物', '血液'];
      for (const s of JUDGEMENT_SENTENCES) {
        for (const word of forbiddenWords) {
          expect(s.text).not.toContain(word);
          expect(s.reason).not.toContain(word);
        }
      }
      for (const s of PARTICLE_SENTENCES) {
        for (const word of forbiddenWords) {
          expect(s.before).not.toContain(word);
          expect(s.after).not.toContain(word);
        }
      }
    });
  });
});
