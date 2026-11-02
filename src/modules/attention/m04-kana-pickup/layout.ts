/**
 * M04 仮名拾い・二重課題 行折り返し・禁則処理レイアウト
 * ARCHITECTURE.md §5.4, §9 準拠
 */

import { classifyKana, toCodePoints } from '../../../utils/kana';

export interface FormattedChar {
  readonly ch: string;
  readonly colOffset: number;
  readonly charIndex: number;
}

export interface FormattedLine {
  readonly chars: readonly FormattedChar[];
}

/**
 * 行頭禁則文字の判定（「、」「。」「ー」および小書き文字）
 */
export function isLineHeadProhibited(ch: string): boolean {
  if (ch === '、' || ch === '。' || ch === 'ー') {
    return true;
  }
  const info = classifyKana(ch);
  return info.isSmall;
}

interface RawChar {
  readonly ch: string;
  readonly charIndex: number;
}

/**
 * 読解コーパス本文を指定した折り返し規則で行配列にフォーマットする。
 *
 * @param kanaText 分かち書きのひらがな本文（単語間は半角スペース1個）
 * @param spacing 'solid'（ベタ組み・スペース除去）または 'wakachi'（分かち書き・スペース0.5マス幅）
 * @param maxColsPerLine 1行あたりの最大マス数
 */
export function formatPassageLines(
  kanaText: string,
  spacing: 'solid' | 'wakachi',
  maxColsPerLine: number,
): FormattedLine[] {
  const maxCols = Math.max(5, maxColsPerLine);

  // 全文字にスペース除外の文字インデックスを付与
  const wordsRaw = kanaText.split(' ');
  const words: RawChar[][] = [];
  let globalCharIdx = 0;

  for (const w of wordsRaw) {
    if (w.length === 0) continue;
    const cps = toCodePoints(w);
    const chars: RawChar[] = [];
    for (const ch of cps) {
      chars.push({ ch, charIndex: globalCharIdx++ });
    }
    words.push(chars);
  }

  if (spacing === 'solid') {
    // ベタ組み: 全文字をフラット化して maxCols で折り返す
    const allChars: RawChar[] = [];
    for (const w of words) {
      allChars.push(...w);
    }

    const lines: FormattedLine[] = [];
    let currentLine: FormattedChar[] = [];
    let i = 0;

    while (i < allChars.length) {
      const raw = allChars[i]!;

      // 行末判定
      if (currentLine.length >= maxCols) {
        // 次の文字が行頭禁則文字なら、直前の行末にぶら下げる（最大2文字まで）
        if (isLineHeadProhibited(raw.ch) && currentLine.length < maxCols + 2) {
          currentLine.push({
            ch: raw.ch,
            colOffset: currentLine.length,
            charIndex: raw.charIndex,
          });
          i++;
          continue;
        }

        // 新しい行へ
        lines.push({ chars: currentLine });
        currentLine = [];

        // 新しい行の先頭に禁則文字が来ないよう、もし先頭が禁則文字なら直前の行から1文字追い出す
        // （上記ぶら下げで通常は防がれるが二重の安全ガード）
        if (isLineHeadProhibited(raw.ch) && lines.length > 0) {
          const prev = lines[lines.length - 1]!;
          if (prev.chars.length > 1) {
            const popped = (prev.chars as FormattedChar[]).pop()!;
            currentLine.push({
              ch: popped.ch,
              colOffset: 0,
              charIndex: popped.charIndex,
            });
          }
        }
      }

      currentLine.push({
        ch: raw.ch,
        colOffset: currentLine.length,
        charIndex: raw.charIndex,
      });
      i++;
    }

    if (currentLine.length > 0) {
      lines.push({ chars: currentLine });
    }

    return lines;
  }

  // spacing === 'wakachi'
  const lines: FormattedLine[] = [];
  let currentLine: FormattedChar[] = [];
  let currentOffset = 0;

  for (const word of words) {
    const wordLen = word.length;
    if (wordLen === 0) continue;

    const spaceGap = currentLine.length > 0 ? 0.5 : 0;
    const needed = spaceGap + wordLen;

    // 文節が行内に収まる場合
    if (currentOffset + needed <= maxCols) {
      currentOffset += spaceGap;
      for (const raw of word) {
        currentLine.push({
          ch: raw.ch,
          colOffset: currentOffset,
          charIndex: raw.charIndex,
        });
        currentOffset += 1;
      }
      continue;
    }

    // 行内に収まらない場合
    // 現在の行に既に文字があるなら改行
    if (currentLine.length > 0) {
      lines.push({ chars: currentLine });
      currentLine = [];
      currentOffset = 0;
    }

    // 改行してもなお文節長が maxCols を超える場合、または収まる場合
    if (wordLen <= maxCols) {
      for (const raw of word) {
        currentLine.push({
          ch: raw.ch,
          colOffset: currentOffset,
          charIndex: raw.charIndex,
        });
        currentOffset += 1;
      }
    } else {
      // 1文節が1行の長さを超える長文節（極端に狭い列幅設定時など）の安全な強制折り返し
      for (const raw of word) {
        if (currentOffset >= maxCols) {
          if (isLineHeadProhibited(raw.ch) && currentOffset < maxCols + 2) {
            currentLine.push({
              ch: raw.ch,
              colOffset: currentOffset,
              charIndex: raw.charIndex,
            });
            currentOffset += 1;
            continue;
          }
          lines.push({ chars: currentLine });
          currentLine = [];
          currentOffset = 0;
        }
        currentLine.push({
          ch: raw.ch,
          colOffset: currentOffset,
          charIndex: raw.charIndex,
        });
        currentOffset += 1;
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push({ chars: currentLine });
  }

  return lines;
}
