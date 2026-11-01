/**
 * バッチ横断の非復元抽出プール（drawFromPool）
 * ARCHITECTURE.md §5.5 準拠
 */

import type { ModuleId, WarningCode } from '../types/schema';
import { createPoolRng } from './prng';

export interface DrawFromPoolArgs<T> {
  readonly seed: number;
  readonly moduleId: ModuleId;
  readonly sheetIndex: number;
  readonly poolKey: string;
  readonly items: readonly T[];
  readonly count: number;
  readonly warn: (code: WarningCode, message: string) => void;
}

/**
 * バッチ横断で重複を最小化する非復元抽出を行う。
 *  - sheetIndex や batchCount に依存しない一意のシャッフル列を生成する。
 *  - count > items.length の場合は items.length に切り詰め、1枚内重複を絶対に防ぐ。
 *  - プール周回（ラップアラウンド）時は POOL_EXHAUSTED を警告する。
 */
export function drawFromPool<T>(args: DrawFromPoolArgs<T>): T[] {
  if (args.count <= 0 || args.items.length === 0) {
    return [];
  }

  let count = args.count;
  if (count > args.items.length) {
    args.warn(
      'POOL_EXHAUSTED',
      `データ収録数 (${args.items.length}) を超える抽出要求 (${args.count}) があったため、最大数に調整しました`,
    );
    count = args.items.length;
  }

  // sheetIndex に依存しない並び順を生成
  const order = createPoolRng(args.seed, args.moduleId, args.poolKey).shuffle(args.items);

  const start = ((args.sheetIndex - 1) * count) % order.length;
  if (args.sheetIndex * count > order.length) {
    args.warn(
      'POOL_EXHAUSTED',
      'データ数が不足しているため、前の紙面と同じ問題が出ることがあります',
    );
  }

  return Array.from({ length: count }, (_, k) => order[(start + k) % order.length]!);
}
