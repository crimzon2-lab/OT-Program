/**
 * M08 サブモード B: アナグラム（仮名並べ替え）
 * ARCHITECTURE.md §5.4, §8, §9, §10 準拠
 */

import { VOCAB_CATEGORY_MAP } from '../../../data/vocabulary';
import type { GenerateContext, M08Params, VocabEntry } from '../../../types/schema';
import { toCodePoints } from '../../../utils/kana';
import { filterAndDrawVocab } from './common';

export interface AnagramProblemItem {
  readonly index: number;
  readonly entry: VocabEntry;
  /** シャッフルされた仮名文字配列（元の語順と必ず異なる） */
  readonly shuffledChars: readonly string[];
  /** 文字数（解答マスの個数） */
  readonly charCount: number;
  /** カテゴリヒント（showCategoryHint が true の場合） */
  readonly categoryHint?: string;
  /** 正解文字列（kana） */
  readonly answerKana: string;
}

export interface AnagramData {
  readonly subMode: 'anagram';
  readonly items: readonly AnagramProblemItem[];
}

/**
 * 文字列をシャッフルし、元の語順と異なる並びを保証する
 */
export function shuffleAnagramChars(
  chars: readonly string[],
  rng: GenerateContext['rng'],
): string[] {
  const original = chars.join('');
  let shuffled = rng.shuffle(chars);

  // 元の並び順と一致してしまった場合は最大10回再シャッフル
  let attempts = 0;
  while (shuffled.join('') === original && attempts < 10) {
    shuffled = rng.shuffle(chars);
    attempts++;
  }

  // それでも偶然一致した場合は先頭2文字をスワップして確実に異なる並びにする
  if (shuffled.join('') === original && shuffled.length >= 2) {
    const swapped = [...shuffled];
    const tmp = swapped[0]!;
    swapped[0] = swapped[1]!;
    swapped[1] = tmp;
    shuffled = swapped;
  }

  return shuffled;
}

/**
 * サブモード B（アナグラム）の問題データを生成する
 */
export function generateAnagramMode(ctx: GenerateContext, params: M08Params): AnagramData {
  let minLength = params.minLength;
  let maxLength = params.maxLength;

  // アナグラムは 3..5 文字に clamp
  if (minLength < 3 || minLength > 5) {
    const clampedMin = Math.max(3, Math.min(5, minLength));
    ctx.warn('PARAM_CLAMPED', `アナグラムの最小文字数(${minLength})を ${clampedMin} に調整しました。`);
    minLength = clampedMin;
  }
  if (maxLength < 3 || maxLength > 5) {
    const clampedMax = Math.max(3, Math.min(5, maxLength));
    ctx.warn('PARAM_CLAMPED', `アナグラムの最大文字数(${maxLength})を ${clampedMax} に調整しました。`);
    maxLength = clampedMax;
  }
  if (minLength > maxLength) {
    const tmp = minLength;
    minLength = maxLength;
    maxLength = tmp;
  }

  // 全文字が同一の単語（アナグラムが成立しない語）を除外
  const filterFn = (entry: VocabEntry): boolean => {
    const cps = toCodePoints(entry.kana);
    return new Set(cps).size > 1;
  };

  const { entries } = filterAndDrawVocab(ctx, {
    categories: params.categories,
    minLength,
    maxLength,
    count: params.itemCount,
    poolKey: 'm08-anagram',
    filterFn,
  });

  const items: AnagramProblemItem[] = entries.map((entry, idx) => {
    const chars = toCodePoints(entry.kana);
    const shuffledChars = shuffleAnagramChars(chars, ctx.rng);

    let categoryHint: string | undefined;
    if (params.showCategoryHint) {
      const cat = VOCAB_CATEGORY_MAP[entry.category];
      categoryHint = cat ? cat.hintPhrase : undefined;
    }

    return {
      index: idx + 1,
      entry,
      shuffledChars,
      charCount: chars.length,
      categoryHint,
      answerKana: entry.kana,
    };
  });

  return {
    subMode: 'anagram',
    items,
  };
}
