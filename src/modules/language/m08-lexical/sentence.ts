/**
 * M08 サブモード D: 短文課題（助詞補充・意味正誤判定）
 * ARCHITECTURE.md §6, §8, §9, §10 準拠
 */

import { JUDGEMENT_SENTENCES } from '../../../data/sentences/judgement';
import { PARTICLE_SENTENCES } from '../../../data/sentences/particle';
import type {
  ChecklistItem,
  GenerateContext,
  JudgementSentence,
  M08Params,
  Particle,
  ParticleSentence,
} from '../../../types/schema';

export interface ParticleChoiceOption {
  readonly choiceIndex: number; // 1-based (1..3)
  readonly particle: Particle;
  readonly isCorrect: boolean;
}

export interface ParticleBlankItem {
  readonly index: number;
  readonly sentence: ParticleSentence;
  readonly before: string;
  readonly after: string;
  readonly answer: Particle;
  readonly acceptable: readonly Particle[];
}

export interface ParticleChoiceItem {
  readonly index: number;
  readonly sentence: ParticleSentence;
  readonly before: string;
  readonly after: string;
  readonly choices: readonly ParticleChoiceOption[];
  readonly answerChoiceIndex: number;
  readonly answerParticle: Particle;
  readonly acceptable: readonly Particle[];
}

export interface JudgementItem {
  readonly index: number;
  readonly sentence: JudgementSentence;
  readonly text: string;
  readonly isValid: boolean;
  readonly reason: string;
}

export interface SentenceData {
  readonly subMode: 'sentence';
  readonly sentenceTask: M08Params['sentenceTask'];
  readonly blankItems?: readonly ParticleBlankItem[];
  readonly choiceItems?: readonly ParticleChoiceItem[];
  readonly judgementItems?: readonly JudgementItem[];
}

/**
 * 助詞空欄補充課題のデータを生成する
 */
export function generateParticleBlank(ctx: GenerateContext, params: M08Params): SentenceData {
  const chosen = ctx.draw<ParticleSentence>(
    'm08-particle-blank',
    PARTICLE_SENTENCES,
    params.itemCount,
  );

  const blankItems: ParticleBlankItem[] = chosen.map((sentence, idx) => ({
    index: idx + 1,
    sentence,
    before: sentence.before,
    after: sentence.after,
    answer: sentence.answer,
    acceptable: sentence.acceptable,
  }));

  return {
    subMode: 'sentence',
    sentenceTask: 'particleBlank',
    blankItems,
  };
}

/**
 * 助詞選択肢課題のデータを生成する
 */
export function generateParticleChoice(ctx: GenerateContext, params: M08Params): SentenceData {
  const chosen = ctx.draw<ParticleSentence>(
    'm08-particle-choice',
    PARTICLE_SENTENCES,
    params.itemCount,
  );

  const choiceItems: ParticleChoiceItem[] = chosen.map((sentence, idx) => {
    // 3択: answer と distractors 2個
    const optionsRaw: { particle: Particle; isCorrect: boolean }[] = [
      { particle: sentence.answer, isCorrect: true },
      { particle: sentence.distractors[0], isCorrect: false },
      { particle: sentence.distractors[1], isCorrect: false },
    ];
    const shuffled = ctx.rng.shuffle(optionsRaw);

    const choices: ParticleChoiceOption[] = shuffled.map((opt, cIdx) => ({
      choiceIndex: cIdx + 1,
      particle: opt.particle,
      isCorrect: opt.isCorrect,
    }));

    const correctChoice = choices.find((c) => c.isCorrect)!;

    return {
      index: idx + 1,
      sentence,
      before: sentence.before,
      after: sentence.after,
      choices,
      answerChoiceIndex: correctChoice.choiceIndex,
      answerParticle: sentence.answer,
      acceptable: sentence.acceptable,
    };
  });

  return {
    subMode: 'sentence',
    sentenceTask: 'particleChoice',
    choiceItems,
  };
}

/**
 * 意味正誤判定課題のデータを生成する
 */
export function generateJudgement(ctx: GenerateContext, params: M08Params): SentenceData {
  const count = params.itemCount;
  const halfCount = Math.floor(count / 2);
  const validCount = halfCount;
  const invalidCount = count - halfCount;

  const validPool = JUDGEMENT_SENTENCES.filter((s) => s.isValid);
  const invalidPool = JUDGEMENT_SENTENCES.filter((s) => !s.isValid);

  const chosenValid = ctx.draw<JudgementSentence>(
    'm08-judgement-valid',
    validPool,
    validCount,
  );
  const chosenInvalid = ctx.draw<JudgementSentence>(
    'm08-judgement-invalid',
    invalidPool,
    invalidCount,
  );

  const combined = [...chosenValid, ...chosenInvalid];
  const shuffled = ctx.rng.shuffle(combined);

  const judgementItems: JudgementItem[] = shuffled.map((sentence, idx) => ({
    index: idx + 1,
    sentence,
    text: sentence.text,
    isValid: sentence.isValid,
    reason: sentence.reason,
  }));

  return {
    subMode: 'sentence',
    sentenceTask: 'judgement',
    judgementItems,
  };
}

/**
 * サブモード D（短文課題）の問題データを生成する
 */
export function generateSentenceMode(ctx: GenerateContext, params: M08Params): SentenceData {
  switch (params.sentenceTask) {
    case 'particleChoice':
      return generateParticleChoice(ctx, params);
    case 'judgement':
      return generateJudgement(ctx, params);
    case 'particleBlank':
    default:
      return generateParticleBlank(ctx, params);
  }
}

/**
 * 短文課題のチェックリストアイテムを生成する
 */
export function buildSentenceChecklist(data: SentenceData): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (data.blankItems) {
    for (const item of data.blankItems) {
      let expected = item.answer;
      if (item.acceptable.length > 0) {
        expected += `（${item.acceptable.join(' / ')} も可）`;
      }
      items.push({
        id: `check-blank-${item.index}`,
        label: `問${item.index}`,
        expected,
        points: 1,
      });
    }
  } else if (data.choiceItems) {
    for (const item of data.choiceItems) {
      const choiceCircle = ['①', '②', '③'][item.answerChoiceIndex - 1] ?? `${item.answerChoiceIndex}`;
      let expected = `${choiceCircle} 「${item.answerParticle}」`;
      if (item.acceptable.length > 0) {
        expected += `（${item.acceptable.join(' / ')} も可）`;
      }
      items.push({
        id: `check-choice-${item.index}`,
        label: `問${item.index}`,
        expected,
        points: 1,
      });
    }
  } else if (data.judgementItems) {
    for (const item of data.judgementItems) {
      items.push({
        id: `check-judge-${item.index}`,
        label: `問${item.index}`,
        expected: `${item.isValid ? '○' : '×'}（${item.reason}）`,
        points: 1,
      });
    }
  }

  return items;
}
