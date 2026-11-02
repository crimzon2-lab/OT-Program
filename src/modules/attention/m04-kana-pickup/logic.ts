/**
 * M04 仮名拾い・二重課題 生成ロジック
 * ARCHITECTURE.md §5.4, §8, §9 準拠
 */

import { PASSAGES } from '../../../data/passages';
import {
  HIRAGANA_SEION,
  VOWEL_TARGETS,
  type CommonParams,
  type ComprehensionQuestion,
  type GenerateContext,
  type M04Params,
  type Passage,
} from '../../../types/schema';
import {
  dakuonVariantsOf,
  isKanaTarget,
  toCodePoints,
} from '../../../utils/kana';
import { formatPassageLines } from './layout';

export interface KanaCharItem {
  readonly ch: string;
  readonly colOffset: number;
  readonly isTarget: boolean;
  readonly charIndex: number;
}

export interface KanaLine {
  readonly row: number;
  readonly chars: readonly KanaCharItem[];
  readonly targetCount: number;
}

export interface M04ProblemData {
  readonly subMode: 'random' | 'passage';
  readonly targets: string;
  readonly lines: readonly KanaLine[];
  readonly totalTargets: number;
  readonly passage?: Passage;
  readonly questions?: readonly ComprehensionQuestion[];
  readonly effCharSize: number;
  readonly maxCols: number;
}

/**
 * M04（仮名拾い・二重課題）の文字配置・正解判定・内容確認問題を生成する。
 */
export function generateM04Data(
  ctx: GenerateContext,
  params: M04Params & CommonParams,
): M04ProblemData {
  const textScale = params.textScale ?? 100;
  const effCharSize = params.charSizeMm * (textScale / 100);

  // 1) ターゲット文字の決定
  let targets: string;
  if (params.targetPreset === 'vowels') {
    targets = VOWEL_TARGETS;
  } else {
    targets = (params.customTargets ?? '').trim();
    if (targets.length === 0) {
      targets = 'あ'; // 安全フォールバック
    }
  }

  const targetChars = toCodePoints(targets);
  const matchOpts = { targets, includeSmall: params.includeSmallKana };

  // 2) サブモード別の生成
  if (params.subMode === 'random') {
    const rows = params.rows;
    const cols = params.charsPerRow;
    const lines: KanaLine[] = [];
    let totalTargets = 0;

    // 濁音・半濁音デコイの収集
    const decoyPool: string[] = [];
    if (params.dakuonDecoys) {
      for (const t of targetChars) {
        decoyPool.push(...dakuonVariantsOf(t));
      }
    }

    // 非ターゲット清音プール
    const nonTargetSeion = toCodePoints(HIRAGANA_SEION).filter(
      (c) => !targetChars.includes(c),
    );

    let globalIdx = 0;

    for (let r = 0; r < rows; r++) {
      const targetCountInRow = Math.max(
        1,
        Math.round((cols * params.targetRate) / 100),
      );
      const rowIndices = Array.from({ length: cols }, (_, i) => i);
      const targetColIndices = new Set(
        ctx.rng.fork(`row-targets-${r}`).sample(rowIndices, targetCountInRow),
      );

      // デコイ配置列の選定（空いている列から1〜2個）
      const remainingCols = rowIndices.filter((c) => !targetColIndices.has(c));
      const decoyColIndices = new Set<number>();
      if (decoyPool.length > 0 && remainingCols.length > 0) {
        const decoyCount = Math.min(
          remainingCols.length,
          ctx.rng.fork(`decoy-count-${r}`).int(1, 2),
        );
        const sampled = ctx.rng.fork(`decoy-cols-${r}`).sample(remainingCols, decoyCount);
        for (const dc of sampled) decoyColIndices.add(dc);
      }

      const rowChars: KanaCharItem[] = [];

      for (let c = 0; c < cols; c++) {
        let ch: string;
        let isTarget = false;

        if (targetColIndices.has(c)) {
          ch = ctx.rng.fork(`target-pick-${r}-${c}`).pick(targetChars);
          isTarget = true;
          totalTargets++;
        } else if (decoyColIndices.has(c)) {
          ch = ctx.rng.fork(`decoy-pick-${r}-${c}`).pick(decoyPool);
          isTarget = false; // 濁音・半濁音は常に非ターゲット
        } else {
          ch = ctx.rng.fork(`non-target-pick-${r}-${c}`).pick(nonTargetSeion);
          isTarget = false;
        }

        rowChars.push({
          ch,
          colOffset: c,
          isTarget,
          charIndex: globalIdx++,
        });
      }

      lines.push({
        row: r,
        chars: rowChars,
        targetCount: targetCountInRow,
      });
    }

    return {
      subMode: 'random',
      targets,
      lines,
      totalTargets,
      effCharSize,
      maxCols: cols,
    };
  }

  // subMode === 'passage'
  // 1編を非復元抽出
  const drawnPassages = ctx.draw('passages', PASSAGES, 1);
  const passage = drawnPassages[0] ?? PASSAGES[0]!;

  // 有効幅から maxColsPerLine を算出
  // 用紙幅 186mm、左右余白各 8mm (本文幅 170mm)
  // 右余白として行末ぶら下げ（1文字）＋解答シート行末正解数「 (99)」欄（12mm）を確保
  const colAdvance = effCharSize * 1.05;
  const rightReservedMm = colAdvance + 12;
  const gridAvailW = Math.max(20, 170 - rightReservedMm);
  const maxCols = Math.max(10, Math.floor(gridAvailW / colAdvance));

  const formattedLines = formatPassageLines(passage.kanaText, params.spacing, maxCols);

  let totalTargets = 0;
  const lines: KanaLine[] = [];

  for (let r = 0; r < formattedLines.length; r++) {
    const fLine = formattedLines[r]!;
    let rowTargets = 0;
    const rowChars: KanaCharItem[] = [];

    for (const fc of fLine.chars) {
      const isTarget = isKanaTarget(fc.ch, matchOpts);
      if (isTarget) {
        rowTargets++;
        totalTargets++;
      }
      rowChars.push({
        ch: fc.ch,
        colOffset: fc.colOffset,
        isTarget,
        charIndex: fc.charIndex,
      });
    }

    lines.push({
      row: r,
      chars: rowChars,
      targetCount: rowTargets,
    });
  }

  // 内容確認問題の抽出と選択肢シャッフル（正答追従）
  const qCount = Math.max(2, Math.min(3, params.questionCount));
  const rawQuestions = passage.questions.slice(0, qCount);
  const questions: ComprehensionQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i]!;
    const correctChoiceText = q.choices[q.answerIndex]!;
    const shuffledChoices = ctx.rng
      .fork(`q-choices-${i}`)
      .shuffle([...q.choices]) as unknown as readonly [string, string, string];
    const newAnswerIndex = shuffledChoices.indexOf(correctChoiceText) as 0 | 1 | 2;

    questions.push({
      prompt: q.prompt,
      choices: shuffledChoices,
      answerIndex: newAnswerIndex,
    });
  }

  return {
    subMode: 'passage',
    targets,
    lines,
    totalTargets,
    passage,
    questions,
    effCharSize,
    maxCols,
  };
}
