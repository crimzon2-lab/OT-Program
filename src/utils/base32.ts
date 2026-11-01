/**
 * Crockford's Base32 エンコーダ／デコーダおよびビットストリーム
 * ARCHITECTURE.md §4.2, §4.3 準拠
 */

import { COND_GROUP_LENGTH, CROCKFORD_ALPHABET } from '../types/schema';

/**
 * 最大インデックス値を表現するのに必要な最小ビット幅を返す。
 * 例: 0 -> 0, 1 -> 1, 2 -> 2, 3 -> 2, 4 -> 3, 7 -> 3, 8 -> 4, 31 -> 5, 45 -> 6
 */
export function bitWidth(maxIndex: number): number {
  if (maxIndex <= 0) {
    return 0;
  }
  return Math.floor(Math.log2(maxIndex)) + 1;
}

/**
 * ビットストリーム書き込みクラス。
 * 内部表現にビット配列 (0 | 1)[] を用い、32bit以上のオーバーフローや符号反転を防ぐ。
 */
export class BitWriter {
  private readonly bits: number[] = [];

  /**
   * MSB ファーストでビットを書き込む。
   * bits <= 0 の場合は何もしない (no-op)。
   */
  write(value: number, bits: number): void {
    if (bits <= 0) return;
    for (let i = bits - 1; i >= 0; i--) {
      // 32bit 以上でも安全にビット抽出するため Math.floor を併用
      const bit = Math.floor(value / 2 ** i) % 2;
      this.bits.push(bit);
    }
  }

  /**
   * 現在書き込まれている総ビット数
   */
  get length(): number {
    return this.bits.length;
  }

  /**
   * 蓄積されたビットを 5bit 単位で区切り、Crockford's Base32 文字列に変換する。
   * 端数ビットは下位を 0 で埋めて 5bit に拡張する。
   */
  toCrockford(): string {
    if (this.bits.length === 0) {
      return '';
    }
    let result = '';
    const total = this.bits.length;
    for (let i = 0; i < total; i += 5) {
      let val = 0;
      for (let k = 0; k < 5; k++) {
        const bit = this.bits[i + k] ?? 0;
        val = val * 2 + bit;
      }
      result += CROCKFORD_ALPHABET[val];
    }
    return result;
  }
}

/**
 * ビットストリーム読み出しクラス。
 */
export class BitReader {
  private cursor = 0;

  constructor(private readonly bits: readonly number[]) {}

  /**
   * Crockford Base32 文字列から BitReader を構築する。
   * 大文字化、O->0, I->1, L->1 の誤読正規化を行う。
   * CROCKFORD_ALPHABET 以外の文字（U や記号等）が含まれる場合は null を返す。
   */
  static fromCrockford(chars: string): BitReader | null {
    const normalized = chars.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
    const bits: number[] = [];

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i]!;
      const idx = CROCKFORD_ALPHABET.indexOf(ch);
      if (idx === -1) {
        return null;
      }
      for (let b = 4; b >= 0; b--) {
        bits.push((idx >> b) & 1);
      }
    }

    return new BitReader(bits);
  }

  /**
   * 未読み込みの残りビット数
   */
  get remainingBits(): number {
    return Math.max(0, this.bits.length - this.cursor);
  }

  /**
   * MSB ファーストで指定ビット数を読み出して数値として返す。
   * bitCount <= 0 の場合は 0 を返す。
   * 残りビット数が不足している場合は Error をスローする。
   */
  read(bitCount: number): number {
    if (bitCount <= 0) return 0;
    if (this.remainingBits < bitCount) {
      throw new Error(
        `Unexpected end of bitstream: requested ${bitCount} bits but only ${this.remainingBits} remaining`,
      );
    }
    let val = 0;
    for (let i = 0; i < bitCount; i++) {
      val = val * 2 + (this.bits[this.cursor++] ?? 0);
    }
    return val;
  }
}

/**
 * 文字列を groupLen (既定 4) 文字ごとにハイフン '-' で区切る。
 */
export function groupByHyphen(str: string, groupLen = COND_GROUP_LENGTH): string {
  if (str.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < str.length; i += groupLen) {
    parts.push(str.slice(i, i + groupLen));
  }
  return parts.join('-');
}
