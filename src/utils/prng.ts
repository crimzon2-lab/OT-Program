/**
 * ============================================================================
 *  reha-print : シード付き擬似乱数生成器（CONTRACT LOCK / 変更禁止）
 * ============================================================================
 *  - 問題生成ロジックでは Math.random() の使用を全面禁止する。
 *    乱数は必ず GenerateContext.rng（= 本ファイルの Rng）から取得すること。
 *  - 例外：generateNumericSeed() のみ「新しい基本シードを自動採番する」目的で
 *    crypto.getRandomValues を使う（生成内容そのものには関与しない）。
 *  - アルゴリズム（cyrb53 / Mulberry32 / Fisher-Yates）と呼び出し順序を変えると
 *    過去に印刷したシードコードが再現できなくなるため、本ファイルは改変禁止。
 *    バグ修正が必要な場合も SEED_CODE_VERSION（schema.ts）を上げる手続きが必要。
 * ============================================================================
 */

/** uint32 の最大値 */
export const UINT32_MAX = 0xffffffff;

/**
 * cyrb53 文字列ハッシュ（53bit 整数を返す）。
 * 入力文字列は呼び出し側で NFC 正規化済みであることを前提とする。
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** 文字列 → uint32（cyrb53 の下位 32bit） */
export function hashStringToUint32(str: string): number {
  return cyrb53(str) >>> 0;
}

/**
 * 複数の部品から派生シード（uint32）を作る。
 * 例：deriveSeed(482914, 'M01', 'sheet', 3)
 * 部品は String() 化して U+001F（単位区切り）で連結してからハッシュする。
 */
export function deriveSeed(...parts: ReadonlyArray<string | number>): number {
  return hashStringToUint32(parts.map((p) => String(p)).join('\u001f'));
}

/** Mulberry32：uint32 シードから [0, 1) の一様乱数を返す関数を作る */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 決定論的乱数インターフェース。
 * すべてのメソッドは内部状態を進める（fork を除く）。
 */
export interface Rng {
  /** この Rng の初期シード（uint32） */
  readonly seed: number;
  /** [0, 1) の一様乱数 */
  next(): number;
  /** [min, max] の整数（両端含む）。min > max の場合は例外 */
  int(min: number, max: number): number;
  /** [min, max) の実数 */
  float(min: number, max: number): number;
  /** 確率 p で true */
  chance(p: number): boolean;
  /** 配列から 1 要素を選ぶ。空配列は例外 */
  pick<T>(items: readonly T[]): T;
  /** 重み付き選択。weights は items と同じ長さ・非負・合計 > 0 */
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Fisher-Yates シャッフルした「新しい配列」を返す（元配列は変更しない） */
  shuffle<T>(items: readonly T[]): T[];
  /** Fisher-Yates で配列をその場でシャッフルし、同じ配列を返す */
  shuffleInPlace<T>(items: T[]): T[];
  /** 非復元抽出で k 個選ぶ（k > length は例外）。返り値の順序もランダム */
  sample<T>(items: readonly T[], k: number): T[];
  /**
   * 用途別の独立した子 Rng を作る。
   * 子のシードは「この Rng の初期シード + label」だけで決まり、
   * 親がそれまでに何回乱数を消費したかには依存しない。
   * → パラメータ追加やロジック変更で他の用途の乱数列がずれるのを防ぐ。
   */
  fork(label: string): Rng;
}

class Mulberry32Rng implements Rng {
  readonly seed: number;
  private readonly gen: () => number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.gen = mulberry32(this.seed);
  }

  next(): number {
    return this.gen();
  }

  int(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new RangeError(`Rng.int: non-finite range [${min}, ${max}]`);
    }
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (lo > hi) throw new RangeError(`Rng.int: empty range [${min}, ${max}]`);
    return lo + Math.floor(this.gen() * (hi - lo + 1));
  }

  float(min: number, max: number): number {
    if (min > max) throw new RangeError(`Rng.float: empty range [${min}, ${max})`);
    return min + this.gen() * (max - min);
  }

  chance(p: number): boolean {
    return this.gen() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Rng.pick: empty array');
    return items[Math.floor(this.gen() * items.length)] as T;
  }

  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0 || items.length !== weights.length) {
      throw new RangeError('Rng.pickWeighted: items/weights length mismatch or empty');
    }
    let total = 0;
    for (const w of weights) {
      if (!(w >= 0)) throw new RangeError('Rng.pickWeighted: negative or NaN weight');
      total += w;
    }
    if (total <= 0) throw new RangeError('Rng.pickWeighted: total weight must be > 0');
    let r = this.gen() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i] as number;
      if (r < 0) return items[i] as T;
    }
    // 浮動小数誤差対策：最後の正の重みを返す
    for (let i = items.length - 1; i >= 0; i--) {
      if ((weights[i] as number) > 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  shuffleInPlace<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.gen() * (i + 1));
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }

  shuffle<T>(items: readonly T[]): T[] {
    return this.shuffleInPlace(items.slice());
  }

  sample<T>(items: readonly T[], k: number): T[] {
    if (!Number.isInteger(k) || k < 0 || k > items.length) {
      throw new RangeError(`Rng.sample: k=${k} out of range (length=${items.length})`);
    }
    // 部分 Fisher-Yates：先頭 k 個だけ確定させる
    const arr = items.slice();
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(this.gen() * (arr.length - i));
      const tmp = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = tmp;
    }
    return arr.slice(0, k);
  }

  fork(label: string): Rng {
    return new Mulberry32Rng(deriveSeed(this.seed, 'fork', label));
  }
}

/** uint32 シードから Rng を作る */
export function createRng(seed: number): Rng {
  return new Mulberry32Rng(seed);
}

/**
 * ユーザー入力（シード欄）を uint32 に正規化する。
 *  - 前後空白を除去し NFKC 正規化（全角数字「４８２９１４」→「482914」）。
 *  - 1〜10 桁の10進数で UINT32_MAX 以下ならその数値。
 *  - それ以外（英字混じり・範囲外・空文字）は hashStringToUint32 でハッシュ化。
 *    UI はハッシュ後の数値をシード欄に表示し直すこと（紙面には常に数値シードを印字）。
 *  - 空文字の場合は null（呼び出し側で generateNumericSeed() を使う）。
 */
export function normalizeSeedInput(input: string): number | null {
  const s = input.normalize('NFKC').trim();
  if (s.length === 0) return null;
  if (/^\d{1,10}$/.test(s)) {
    const n = Number(s);
    if (n <= UINT32_MAX) return n;
  }
  return hashStringToUint32(s);
}

/** 自動採番シードの範囲（5〜6 桁） */
export const AUTO_SEED_MIN = 10000;
export const AUTO_SEED_MAX = 999999;

/**
 * 新しい基本シード（10000〜999999 の整数）を自動採番する。
 * 生成内容の再現性とは無関係なので暗号論的乱数源を用いる。
 * crypto が無い環境（古いブラウザ等）では Date.now() から派生する。
 */
export function generateNumericSeed(): number {
  const span = AUTO_SEED_MAX - AUTO_SEED_MIN + 1;
  const c = (globalThis as { crypto?: Crypto }).crypto;
  let r: number;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    r = buf[0] as number;
  } else {
    r = hashStringToUint32(String(Date.now()));
  }
  return AUTO_SEED_MIN + (r % span);
}

/**
 * 紙面（シート）ごとの Rng を作る標準関数。
 * core/generator.ts は必ずこれを使うこと。
 *   sheetIndex は 1 始まり。sheetCount（バッチ枚数）は引数に含めない
 *   → 「10枚中3枚目」を単独で再生成しても同一紙面になる。
 */
export function createSheetRng(seed: number, moduleId: string, sheetIndex: number): Rng {
  return createRng(deriveSeed(seed, moduleId, 'sheet', sheetIndex));
}

/**
 * バッチ横断の非復元抽出用：プール全体の並び順を決める Rng。
 * src/utils/pool.ts から利用する。sheetIndex に依存しないことが重要。
 */
export function createPoolRng(seed: number, moduleId: string, poolKey: string): Rng {
  return createRng(deriveSeed(seed, moduleId, 'pool', poolKey));
}
