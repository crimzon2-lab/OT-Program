/**
 * M03 符号変換課題（SDMT様）生成ロジック
 * ARCHITECTURE.md §8, §9 準拠
 */

import { selectDistinctSdmtSymbols } from '../../../data/symbols';
import {
  STIMULUS_CHARSETS,
  type CommonParams,
  type GenerateContext,
  type M03Params,
  type SymbolDef,
} from '../../../types/schema';
import type { M03ExtendedParams, M03TargetType } from './index';

export interface SymbolKey {
  readonly symbol: SymbolDef;
  readonly digit: number; // 1..pairCount
  readonly label: string; // '1'..'9' または 'あ'..'け' 等
}

export interface GridCell {
  readonly row: number;
  readonly col: number;
  readonly symbol: SymbolDef;
  readonly digit: number;
  readonly label: string;
  readonly isPractice: boolean;
}

export interface M03ProblemData {
  readonly keys: readonly SymbolKey[];
  readonly grid: readonly (readonly GridCell[])[];
  readonly rows: number;
  readonly cols: number;
  readonly practiceCells: number;
  readonly totalCells: number;
  readonly mainCells: number;
  readonly targetType: M03TargetType;
}

const FIXED_HIRAGANA_LABELS = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け'] as const;

/**
 * M03（符号変換課題）のキー対応表および問題グリッドを生成する。
 */
export function generateM03Data(
  ctx: GenerateContext,
  params: (M03Params | M03ExtendedParams) & CommonParams,
): M03ProblemData {
  const pairCount = Math.max(6, Math.min(9, params.pairCount));
  const targetType: M03TargetType =
    (params as M03ExtendedParams).targetType ?? 'digit';

  // 1) 互いに形が似ていない記号を形状ファミリー単位で抽出
  const mappingSymbols = selectDistinctSdmtSymbols(
    ctx.rng.fork('key-mapping'),
    pairCount,
    params.shuffleMapping,
  );

  // 変換先ラベル（数字 1〜9 / ひらがな あ〜け / ランダムひらがな）の決定
  let targetLabels: string[];
  if (targetType === 'hiragana') {
    targetLabels = FIXED_HIRAGANA_LABELS.slice(0, pairCount);
  } else if (targetType === 'hiraganaRandom') {
    const hiraPool = Array.from(STIMULUS_CHARSETS.hiragana);
    targetLabels = ctx.rng.fork('target-chars').sample(hiraPool, pairCount);
  } else {
    targetLabels = Array.from({ length: pairCount }, (_, i) => String(i + 1));
  }

  const keys: SymbolKey[] = mappingSymbols.map((symbol, i) => ({
    symbol,
    digit: i + 1,
    label: targetLabels[i] ?? String(i + 1),
  }));

  const rows = params.rows;
  const cols = params.cols;
  const totalCells = rows * cols;
  const practiceCells = Math.max(0, Math.min(12, params.practiceCells));
  const mainCells = Math.max(0, totalCells - practiceCells);

  // 2) 記号プールの作成（各記号の出現回数差 ≤ 1 を厳守）
  const baseCount = Math.floor(totalCells / pairCount);
  const remainder = totalCells % pairCount;

  const rawPool: SymbolKey[] = [];
  for (let i = 0; i < pairCount; i++) {
    const count = baseCount + (i < remainder ? 1 : 0);
    for (let c = 0; c < count; c++) {
      rawPool.push(keys[i]!);
    }
  }

  // シャッフル
  const pool = ctx.rng.fork('cell-pool').shuffle(rawPool);

  // 3) グリッドの割り当て（横隣接重複ゼロの保証）
  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push([]);
  }

  const remaining = [...pool];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const prevId = c > 0 ? grid[r]![c - 1]!.symbol.id : null;

      // 直前と異なる記号を探す
      let foundIndex = -1;
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i]!.symbol.id !== prevId) {
          foundIndex = i;
          break;
        }
      }

      const globalIndex = r * cols + c;
      const isPractice = globalIndex < practiceCells;

      if (foundIndex >= 0) {
        const item = remaining.splice(foundIndex, 1)[0]!;
        grid[r]!.push({
          row: r,
          col: c,
          symbol: item.symbol,
          digit: item.digit,
          label: item.label,
          isPractice,
        });
      } else {
        // 末尾衝突（残りの全要素が prevId と同一記号の場合）:
        // 過去の配置済みセル (pr, pc) から、スワップ可能なセルを探す
        const currentItem = remaining.pop()!;
        let swapped = false;

        for (let pr = 0; pr <= r && !swapped; pr++) {
          const maxColInRow = pr === r ? c : cols;
          for (let pc = 0; pc < maxColInRow; pc++) {
            const pastCell = grid[pr]![pc]!;
            const leftId = pc > 0 ? grid[pr]![pc - 1]!.symbol.id : null;
            const rightId =
              pc + 1 < (pr === r ? c : cols)
                ? grid[pr]![pc + 1]!.symbol.id
                : null;

            // スワップ条件:
            // 1. (pr, pc) に currentItem を置いても左右と重複しない
            // 2. 現在のセル (r, c) に pastCell を置いても左 (prevId) と重複しない
            if (
              currentItem.symbol.id !== leftId &&
              currentItem.symbol.id !== rightId &&
              pastCell.symbol.id !== prevId
            ) {
              // スワップ実行
              grid[pr]![pc] = {
                row: pr,
                col: pc,
                symbol: currentItem.symbol,
                digit: currentItem.digit,
                label: currentItem.label,
                isPractice: pastCell.isPractice,
              };

              grid[r]!.push({
                row: r,
                col: c,
                symbol: pastCell.symbol,
                digit: pastCell.digit,
                label: pastCell.label,
                isPractice,
              });

              swapped = true;
              break;
            }
          }
        }

        // 万一スワップ先が見つからない場合のフォールバック（極端なケースガード）
        if (!swapped) {
          grid[r]!.push({
            row: r,
            col: c,
            symbol: currentItem.symbol,
            digit: currentItem.digit,
            label: currentItem.label,
            isPractice,
          });
        }
      }
    }
  }

  return {
    keys,
    grid,
    rows,
    cols,
    practiceCells,
    totalCells,
    mainCells,
    targetType,
  };
}
