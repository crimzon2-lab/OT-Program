/**
 * 日本語仮名分類・清音/濁音/半濁音/小書き文字の厳密判定ユーティリティ
 * ARCHITECTURE.md §5.4 準拠
 */

import {
  HIRAGANA_DAKUON,
  HIRAGANA_HANDAKUON,
  HIRAGANA_SEION,
  HIRAGANA_SMALL_TO_BASE,
  type KanaInfo,
  type KanaMatchOptions,
  type KanaScript,
} from '../types/schema';

/**
 * 文字列を NFC 正規化した上で 1 文字ごとの配列に分解する
 */
export function toCodePoints(s: string): string[] {
  return Array.from(s.normalize('NFC'));
}

/**
 * カタカナ（U+30A1〜U+30F6）をひらがなに変換し、それ以外はそのまま返す
 */
export function katakanaToHiragana(ch: string): string {
  if (ch.length === 0) return ch;
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x30a1 && cp <= 0x30f6) {
    return String.fromCodePoint(cp - 0x60);
  }
  return ch;
}

/**
 * 文字を NFC 正規化し、ARCHITECTURE.md §5.4 の判定順序に従って分類する
 */
export function classifyKana(ch: string): KanaInfo {
  const norm = ch.normalize('NFC');
  const cps = Array.from(norm);
  const c = cps[0];
  if (!c || cps.length !== 1) {
    return {
      char: norm,
      script: 'other',
      base: norm,
      voicing: 'none',
      isSmall: false,
    };
  }
  const cp = c.codePointAt(0)!;
  let script: KanaScript = 'other';
  if (cp >= 0x3041 && cp <= 0x3096) {
    script = 'hiragana';
  } else if (cp >= 0x30a1 && cp <= 0x30f6) {
    script = 'katakana';
  }

  if (script === 'other') {
    return {
      char: c,
      script: 'other',
      base: c,
      voicing: 'none',
      isSmall: false,
    };
  }

  const h = script === 'katakana' ? katakanaToHiragana(c) : c;

  const smallBase = HIRAGANA_SMALL_TO_BASE[h];
  if (smallBase !== undefined) {
    return {
      char: c,
      script,
      base: smallBase,
      voicing: 'seion',
      isSmall: true,
    };
  }

  if (HIRAGANA_SEION.includes(h)) {
    return {
      char: c,
      script,
      base: h,
      voicing: 'seion',
      isSmall: false,
    };
  }

  if (HIRAGANA_DAKUON.includes(h)) {
    const base = h === 'ゔ' ? 'う' : String.fromCodePoint(h.codePointAt(0)! - 1);
    return {
      char: c,
      script,
      base,
      voicing: 'dakuon',
      isSmall: false,
    };
  }

  if (HIRAGANA_HANDAKUON.includes(h)) {
    const base = String.fromCodePoint(h.codePointAt(0)! - 2);
    return {
      char: c,
      script,
      base,
      voicing: 'handakuon',
      isSmall: false,
    };
  }

  // ゐ・ゑ 等（SEION/DAKUON/HANDAKUON/SMALL に含まれない仮名）
  return {
    char: c,
    script,
    base: h,
    voicing: 'none',
    isSmall: false,
  };
}

/**
 * ひらがな清音ターゲットとの一致判定を行う。
 * ひらがな清音のみを対象とし、濁音・半濁音・カタカナ・記号等は常に false。
 * 小書き文字は includeSmall が true かつ base が targets に含まれる場合のみ true。
 */
export function isKanaTarget(ch: string, opts: KanaMatchOptions): boolean {
  const info = classifyKana(ch);
  if (info.script !== 'hiragana') {
    return false;
  }
  if (info.voicing !== 'seion') {
    return false;
  }
  if (info.isSmall) {
    return Boolean(opts.includeSmall && opts.targets.includes(info.base));
  }
  return opts.targets.includes(info.char);
}

/**
 * chars 内で isKanaTarget が true となる文字数を数える
 */
export function countTargets(chars: readonly string[], opts: KanaMatchOptions): number {
  let count = 0;
  for (const ch of chars) {
    if (isKanaTarget(ch, opts)) {
      count++;
    }
  }
  return count;
}

/**
 * 指定した清音1文字に対応する濁音・半濁音配列を返す。
 * 例: 'か' -> ['が'], 'は' -> ['ば', 'ぱ'], 'う' -> []（ゔは使わない）, 'あ' -> []
 */
export function dakuonVariantsOf(seion: string): string[] {
  const s = seion.normalize('NFC');
  if (!HIRAGANA_SEION.includes(s) || s === 'う') {
    return [];
  }
  const result: string[] = [];
  for (const d of HIRAGANA_DAKUON) {
    if (d === 'ゔ') continue;
    const base = String.fromCodePoint(d.codePointAt(0)! - 1);
    if (base === s) {
      result.push(d);
    }
  }
  for (const p of HIRAGANA_HANDAKUON) {
    const base = String.fromCodePoint(p.codePointAt(0)! - 2);
    if (base === s) {
      result.push(p);
    }
  }
  return result;
}
