/**
 * M07 連続計算・紙面N-back 生成ロジック
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  STIMULUS_CHARSETS,
  type CommonParams,
  type GenerateContext,
  type M07Params,
} from '../../../types/schema';

export interface AdditionRow {
  readonly rowIndex: number; // 1-based
  readonly digits: readonly number[];
  readonly answers: readonly number[];
}

export interface NBackItem {
  readonly char: string;
  readonly isStart: boolean; // i < n (比較対象なし)
  readonly isMatch: boolean; // seq[i] === seq[i - n]
}

export interface NBackRow {
  readonly rowIndex: number; // 1-based
  readonly items: readonly NBackItem[];
  readonly matchCount: number;
}

export type M07Data =
  | {
      readonly subMode: 'serialAddition';
      readonly rows: readonly AdditionRow[];
      readonly totalProblems: number;
    }
  | {
      readonly subMode: 'nBack';
      readonly n: number;
      readonly rows: readonly NBackRow[];
      readonly totalMatches: number;
    };

/**
 * M07 問題データを生成する
 */
export function generateM07Data(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
): M07Data {
  if (params.subMode === 'serialAddition') {
    return generateSerialAdditionData(ctx, params);
  }
  return generateNBackData(ctx, params);
}

/**
 * サブモードA：連続加算データ生成
 */
function generateSerialAdditionData(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
): M07Data {
  const numRows = params.additionRows;
  const numDigits = params.additionDigits;
  const availableDigits = [3, 4, 5, 6, 7, 8, 9];

  const rows: AdditionRow[] = [];
  let totalProblems = 0;

  for (let r = 0; r < numRows; r++) {
    const digits: number[] = [];

    for (let c = 0; c < numDigits; c++) {
      let chosen: number;
      // 同じ数字が3回連続しないように制御
      if (
        c >= 2 &&
        digits[c - 1] === digits[c - 2]
      ) {
        const forbidden = digits[c - 1]!;
        const candidates = availableDigits.filter((d) => d !== forbidden);
        chosen = ctx.rng.pick(candidates);
      } else {
        chosen = ctx.rng.pick(availableDigits);
      }
      digits.push(chosen);
    }

    // 正答配列 (digits[i] + digits[i+1]) % 10
    const answers: number[] = [];
    for (let i = 0; i < numDigits - 1; i++) {
      answers.push((digits[i]! + digits[i + 1]!) % 10);
    }

    totalProblems += answers.length;
    rows.push({
      rowIndex: r + 1,
      digits,
      answers,
    });
  }

  return {
    subMode: 'serialAddition',
    rows,
    totalProblems,
  };
}

/**
 * サブモードB：紙面N-backデータ生成
 */
function generateNBackData(
  ctx: GenerateContext,
  params: M07Params & CommonParams,
): M07Data {
  const n = Number(params.nBackLevel); // 1 or 2
  const numRows = params.nBackRows;
  const length = params.nBackLength;
  const matchRate = params.matchRate; // 25..35 %

  // 刺激プールの文字配列
  let charPool: readonly string[];
  switch (params.nBackItem) {
    case 'hiragana':
      charPool = Array.from(STIMULUS_CHARSETS.hiragana);
      break;
    case 'katakana':
      charPool = Array.from(STIMULUS_CHARSETS.katakana);
      break;
    case 'latin':
      charPool = Array.from(STIMULUS_CHARSETS.latin);
      break;
    case 'digit':
    default:
      charPool = Array.from(STIMULUS_CHARSETS.digit);
      break;
  }

  // 弁別性を高めるため、プールからランダムに 8〜10 文字を選んでその行・課題で使用
  const activeCharset = ctx.rng.sample(charPool, Math.min(10, charPool.length));

  const rows: NBackRow[] = [];
  let totalMatches = 0;

  for (let r = 0; r < numRows; r++) {
    // 判定対象インデックス：i = n .. length - 1（候補数: length - n 個）
    const candidateIndices: number[] = [];
    for (let i = n; i < length; i++) {
      candidateIndices.push(i);
    }

    // 目標一致数（最低1箇所）
    const targetMatchCount = Math.max(
      1,
      Math.round(((length - n) * matchRate) / 100),
    );

    // 一致位置をランダムに選定
    const shuffledCandidates = ctx.rng.shuffle(candidateIndices);
    const chosenMatchIndices = new Set(
      shuffledCandidates.slice(0, targetMatchCount),
    );

    // 左から右へ逐次決定（偶発的一致を完全に防ぐ）
    const seqChars: string[] = [];

    for (let i = 0; i < length; i++) {
      if (i < n) {
        // 先頭 n 個：比較対象なし。直前と同じ文字が連続しすぎないように選択
        const forbidden = i > 0 ? seqChars[i - 1] : undefined;
        const pool = activeCharset.filter((c) => c !== forbidden);
        seqChars.push(ctx.rng.pick(pool.length > 0 ? pool : activeCharset));
      } else {
        const compareChar = seqChars[i - n]!;
        if (chosenMatchIndices.has(i)) {
          // 一致位置：必ず seq[i - n] と同一文字にする
          seqChars.push(compareChar);
        } else {
          // 不一致位置：必ず seq[i - n] 以外の文字から選択する
          const nonMatchingPool = activeCharset.filter((c) => c !== compareChar);
          seqChars.push(ctx.rng.pick(nonMatchingPool));
        }
      }
    }

    const items: NBackItem[] = seqChars.map((ch, idx) => {
      const isStart = idx < n;
      const isMatch = !isStart && ch === seqChars[idx - n];
      return {
        char: ch,
        isStart,
        isMatch,
      };
    });

    const matchCount = items.filter((it) => it.isMatch).length;
    totalMatches += matchCount;

    rows.push({
      rowIndex: r + 1,
      items,
      matchCount,
    });
  }

  return {
    subMode: 'nBack',
    n,
    rows,
    totalMatches,
  };
}
