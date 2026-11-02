/**
 * M06 点つなぎ図形模写・空間記憶マトリクス 生成ロジック
 * ARCHITECTURE.md §8, §9 準拠
 */

import type {
  CommonParams,
  GenerateContext,
  M06Params,
} from '../../../types/schema';

export interface GridPoint {
  readonly r: number;
  readonly c: number;
}

export interface DotSegment {
  readonly index: number; // 1-based
  readonly from: GridPoint;
  readonly to: GridPoint;
}

export interface DotFigure {
  readonly id: string;
  readonly figureIndex: number; // 1-based
  readonly grid: number; // dotGrid
  readonly segments: readonly DotSegment[];
  readonly totalSegments: number;
  readonly leftSegments: number;
  readonly rightSegments: number;
}

export interface MatrixItem {
  readonly id: string;
  readonly index: number; // 1-based
  readonly size: number; // matrixSize
  readonly filledIndices: readonly number[];
  readonly filledCoords: readonly GridPoint[];
}

export type M06Data =
  | {
      readonly subMode: 'dotCopy';
      readonly figures: readonly DotFigure[];
    }
  | {
      readonly subMode: 'spatialMatrix';
      readonly matrices: readonly MatrixItem[];
      readonly matrixSize: number;
      readonly filledCells: number;
    };

/**
 * M06 問題データを生成する
 */
export function generateM06Data(
  ctx: GenerateContext,
  params: M06Params & CommonParams,
): M06Data {
  if (params.subMode === 'dotCopy') {
    return generateDotCopyData(ctx, params);
  }
  return generateSpatialMatrixData(ctx, params);
}

/**
 * 2頂点の無向辺キーを生成する
 */
function edgeKey(p1: GridPoint, p2: GridPoint): string {
  const k1 = `${p1.r},${p1.c}`;
  const k2 = `${p2.r},${p2.c}`;
  return k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
}

/**
 * サブモードA：点つなぎ図形模写データ生成
 */
function generateDotCopyData(
  ctx: GenerateContext,
  params: M06Params & CommonParams,
): M06Data {
  const grid = params.dotGrid;
  const targetSegCount = params.segmentCount;
  const allowDiagonal = params.allowDiagonal;
  const figureCount = params.figureCount;

  const figures: DotFigure[] = [];

  for (let fIdx = 0; fIdx < figureCount; fIdx++) {
    let bestFigure: DotFigure | null = null;

    // USN評価のため、左半分と右半分の両方に線分が含まれる図形を優先探索
    for (let attempt = 0; attempt < 50; attempt++) {
      const figure = buildSingleFigure(
        ctx,
        fIdx + 1,
        grid,
        targetSegCount,
        allowDiagonal,
      );

      // 左半分と右半分の両方に線分が存在するか
      if (figure.leftSegments > 0 && figure.rightSegments > 0) {
        bestFigure = figure;
        break;
      }

      if (!bestFigure) {
        bestFigure = figure;
      }
    }

    figures.push(
      bestFigure ??
        buildSingleFigure(ctx, fIdx + 1, grid, targetSegCount, allowDiagonal),
    );
  }

  return {
    subMode: 'dotCopy',
    figures,
  };
}

/**
 * 1つの連結図形を生成する
 */
function buildSingleFigure(
  ctx: GenerateContext,
  figNum: number,
  grid: number,
  targetSegCount: number,
  allowDiagonal: boolean,
): DotFigure {
  // 初期頂点をランダム選択
  const startR = ctx.rng.int(0, grid - 1);
  const startC = ctx.rng.int(0, grid - 1);

  const visitedNodes: GridPoint[] = [{ r: startR, c: startC }];
  const usedEdges = new Set<string>();
  const segments: DotSegment[] = [];

  let current = { r: startR, c: startC };

  // 隣接オフセットの定義（1ステップのみ。飛び越し辺は絶対に含めない）
  const offsets: readonly [number, number][] = allowDiagonal
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

  while (segments.length < targetSegCount) {
    // 現在の頂点から進める未使用隣接辺を探す
    const validNeighbors: GridPoint[] = [];
    for (const [dr, dc] of offsets) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr >= 0 && nr < grid && nc >= 0 && nc < grid) {
        const neighbor = { r: nr, c: nc };
        if (!usedEdges.has(edgeKey(current, neighbor))) {
          validNeighbors.push(neighbor);
        }
      }
    }

    if (validNeighbors.length > 0) {
      // ランダムに1つ選んで辺を追加
      const next = ctx.rng.pick(validNeighbors);
      usedEdges.add(edgeKey(current, next));
      segments.push({
        index: segments.length + 1,
        from: current,
        to: next,
      });

      if (!visitedNodes.some((p) => p.r === next.r && p.c === next.c)) {
        visitedNodes.push(next);
      }
      current = next;
    } else {
      // 現在の頂点が行き止まりの場合、訪問済み頂点の中から進める有効な枝を持つ頂点を探す
      const candidates: { from: GridPoint; to: GridPoint }[] = [];
      for (const v of visitedNodes) {
        for (const [dr, dc] of offsets) {
          const nr = v.r + dr;
          const nc = v.c + dc;
          if (nr >= 0 && nr < grid && nc >= 0 && nc < grid) {
            const neighbor = { r: nr, c: nc };
            if (!usedEdges.has(edgeKey(v, neighbor))) {
              candidates.push({ from: v, to: neighbor });
            }
          }
        }
      }

      if (candidates.length === 0) {
        // グリッド内の全利用可能辺が尽きた場合（通常は十分余裕あり）
        break;
      }

      const branch = ctx.rng.pick(candidates);
      usedEdges.add(edgeKey(branch.from, branch.to));
      segments.push({
        index: segments.length + 1,
        from: branch.from,
        to: branch.to,
      });

      if (!visitedNodes.some((p) => p.r === branch.to.r && p.c === branch.to.c)) {
        visitedNodes.push(branch.to);
      }
      current = branch.to;
    }
  }

  // 左右線分のカウント
  // 格子の中心線列: mid = (grid - 1) / 2
  const mid = (grid - 1) / 2;
  let leftCount = 0;
  let rightCount = 0;

  for (const seg of segments) {
    const centerC = (seg.from.c + seg.to.c) / 2;
    if (centerC < mid) {
      leftCount++;
    } else if (centerC > mid) {
      rightCount++;
    } else {
      // ちょうど中心線上にある縦線分などは両方に按分（または左に0.5, 右に0.5）
      leftCount += 0.5;
      rightCount += 0.5;
    }
  }

  return {
    id: `fig-${figNum}`,
    figureIndex: figNum,
    grid,
    segments,
    totalSegments: segments.length,
    leftSegments: Math.round(leftCount),
    rightSegments: Math.round(rightCount),
  };
}

/**
 * サブモードB：空間記憶マトリクスデータ生成
 */
function generateSpatialMatrixData(
  ctx: GenerateContext,
  params: M06Params & CommonParams,
): M06Data {
  const size = params.matrixSize;
  const totalCells = size * size;
  const maxFilled = Math.floor(totalCells / 2);

  let filledCount = params.filledCells;
  if (filledCount > maxFilled) {
    filledCount = maxFilled;
    ctx.warn(
      'PARAM_CLAMPED',
      `黒塗りセル数を上限の ${maxFilled} に調整しました`,
    );
  }

  const matrices: MatrixItem[] = [];

  for (let mIdx = 0; mIdx < params.matrixCount; mIdx++) {
    // 全セルインデックス [0 .. totalCells - 1]
    const allIndices: number[] = [];
    for (let i = 0; i < totalCells; i++) {
      allIndices.push(i);
    }

    // 非復元抽出で filledCount 個選出
    const shuffled = ctx.rng.shuffle(allIndices);
    const chosen = shuffled.slice(0, filledCount).sort((a, b) => a - b);

    const coords: GridPoint[] = chosen.map((idx) => ({
      r: Math.floor(idx / size),
      c: idx % size,
    }));

    matrices.push({
      id: `matrix-${mIdx + 1}`,
      index: mIdx + 1,
      size,
      filledIndices: chosen,
      filledCoords: coords,
    });
  }

  return {
    subMode: 'spatialMatrix',
    matrices,
    matrixSize: size,
    filledCells: filledCount,
  };
}
