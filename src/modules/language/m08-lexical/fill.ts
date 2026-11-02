/**
 * M08 サブモード A: 単語穴埋め・喚語書字
 * ARCHITECTURE.md §8, §9, §10 準拠
 */

import { VOCAB_CATEGORY_MAP } from '../../../data/vocabulary';
import type { GenerateContext, M08Params, VocabEntry } from '../../../types/schema';
import { toCodePoints } from '../../../utils/kana';
import { filterAndDrawVocab } from './common';

export interface FillProblemItem {
  readonly index: number;
  readonly entry: VocabEntry;
  /** 各文字マスの状態（表示文字または伏せ字 null） */
  readonly cells: readonly (string | null)[];
  /** 紙面に表示するヒント文 */
  readonly hintText: string;
  /** 正解文字列（kana） */
  readonly answerKana: string;
}

export interface FillData {
  readonly subMode: 'fill';
  readonly items: readonly FillProblemItem[];
}

/**
 * 穴埋め課題の伏せ字セル配列を生成する
 */
export function buildMaskedCells(
  chars: readonly string[],
  fillHint: M08Params['fillHint'],
  rng: GenerateContext['rng'],
): (string | null)[] {
  const len = chars.length;
  if (len <= 0) return [];
  if (len === 1) return [null]; // 1文字の場合は空欄

  const cells: (string | null)[] = new Array(len).fill(null);

  switch (fillHint) {
    case 'initial':
      cells[0] = chars[0] ?? null;
      break;

    case 'final':
      cells[len - 1] = chars[len - 1] ?? null;
      break;

    case 'initialFinal':
      if (len >= 3) {
        cells[0] = chars[0] ?? null;
        cells[len - 1] = chars[len - 1] ?? null;
      } else {
        // 2文字語の場合は語頭のみ表示
        cells[0] = chars[0] ?? null;
      }
      break;

    case 'random':
    default: {
      // 表示文字数は 1 以上 len - 1 以下（全表示・全伏せの禁止）
      const displayCount = Math.min(len - 1, Math.max(1, Math.ceil(len / 3)));
      const allIndices = Array.from({ length: len }, (_, i) => i);
      const chosenIndices = new Set(rng.sample(allIndices, displayCount));
      for (let i = 0; i < len; i++) {
        if (chosenIndices.has(i)) {
          cells[i] = chars[i] ?? null;
        }
      }
      break;
    }
  }

  return cells;
}

/**
 * サブモード A（単語穴埋め）の問題データを生成する
 */
export function generateFillMode(ctx: GenerateContext, params: M08Params): FillData {
  let minLength = params.minLength;
  let maxLength = params.maxLength;

  // initialFinal の場合は3文字以上の語を対象とする
  if (params.fillHint === 'initialFinal' && minLength < 3) {
    minLength = 3;
    if (maxLength < minLength) {
      maxLength = minLength;
    }
  }

  const { entries } = filterAndDrawVocab(ctx, {
    categories: params.categories,
    minLength,
    maxLength,
    count: params.itemCount,
    poolKey: 'm08-fill',
  });

  const items: FillProblemItem[] = entries.map((entry, idx) => {
    const chars = toCodePoints(entry.kana);
    const cells = buildMaskedCells(chars, params.fillHint, ctx.rng);

    let hintText = entry.hint;
    if (params.showCategoryHint) {
      const cat = VOCAB_CATEGORY_MAP[entry.category];
      const catPhrase = cat ? cat.hintPhrase : '';
      hintText = catPhrase ? `【${catPhrase}】${entry.hint}` : entry.hint;
    }

    return {
      index: idx + 1,
      entry,
      cells,
      hintText,
      answerKana: entry.kana,
    };
  });

  return {
    subMode: 'fill',
    items,
  };
}
