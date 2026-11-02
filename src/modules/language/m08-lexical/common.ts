/**
 * M08 言語モジュール 共通ヘルパー
 * ARCHITECTURE.md §8, §10 準拠
 */

import { VOCABULARY, VOCAB_CATEGORY_MAP } from '../../../data/vocabulary';
import type { GenerateContext, M08Params, VocabCategoryId, VocabEntry } from '../../../types/schema';
import { esc } from '../../../utils/html';

/**
 * 語彙エントリを指定された表記形式で HTML 文字列として整形する
 */
export function formatVocabWord(entry: VocabEntry, notation: M08Params['notation']): string {
  switch (notation) {
    case 'hiragana':
      return esc(entry.kana);
    case 'kanji':
      return esc(entry.kanji);
    case 'kanjiRuby':
    default:
      if (entry.kanji === entry.kana) {
        return esc(entry.kana);
      }
      return `<ruby>${esc(entry.kanji)}<rt>${esc(entry.kana)}</rt></ruby>`;
  }
}

/**
 * 語彙エントリを指定された表記形式でプレーンテキスト（回答・チェックリスト用）として整形する
 */
export function formatVocabWordPlain(entry: VocabEntry, notation: M08Params['notation']): string {
  switch (notation) {
    case 'hiragana':
      return entry.kana;
    case 'kanji':
      return entry.kanji;
    case 'kanjiRuby':
    default:
      if (entry.kanji === entry.kana) {
        return entry.kana;
      }
      return `${entry.kanji}（${entry.kana}）`;
  }
}

/**
 * カテゴリと文字数範囲に基づいて語彙プールから非復元抽出する
 */
export function filterAndDrawVocab(
  ctx: GenerateContext,
  params: {
    categories: readonly string[];
    minLength: number;
    maxLength: number;
    count: number;
    poolKey: string;
    filterFn?: (entry: VocabEntry) => boolean;
  },
): { entries: VocabEntry[]; minLen: number; maxLen: number } {
  let minLen = params.minLength;
  let maxLen = params.maxLength;

  if (minLen > maxLen) {
    const tmp = minLen;
    minLen = maxLen;
    maxLen = tmp;
    ctx.warn('PARAM_CLAMPED', `最小文字数(${params.minLength})が最大文字数(${params.maxLength})を超えているため入れ替えました。`);
  }

  const catSet = new Set(params.categories);
  let pool = VOCABULARY.filter(
    (v) =>
      catSet.has(v.category) &&
      v.kanaLength >= minLen &&
      v.kanaLength <= maxLen &&
      (!params.filterFn || params.filterFn(v)),
  );

  // 指定範囲で候補が不足する場合は文字数制約を緩める
  if (pool.length < params.count) {
    pool = VOCABULARY.filter(
      (v) => catSet.has(v.category) && (!params.filterFn || params.filterFn(v)),
    );
  }

  // それでも不足する場合は全語彙から該当フィルタ
  if (pool.length < params.count) {
    pool = VOCABULARY.filter((v) => !params.filterFn || params.filterFn(v));
  }

  const drawn = ctx.draw<VocabEntry>(params.poolKey, pool, params.count);

  return { entries: drawn, minLen, maxLen };
}

/**
 * カテゴリヒント文字列を生成する
 */
export function getCategoryHint(categoryId: VocabCategoryId): string {
  const cat = VOCAB_CATEGORY_MAP[categoryId];
  return cat ? cat.hintPhrase : '';
}
