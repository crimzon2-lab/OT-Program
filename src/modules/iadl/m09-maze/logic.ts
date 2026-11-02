/**
 * M09: 迷路・ルート探索 生成ロジック
 * 完全迷路（閉路なし・全セル連結）を反復型アルゴリズムで生成し、BFSで最短経路を求める
 * ARCHITECTURE.md §5.6, §11.1 準拠（再帰禁止）
 */

import type { GenerateContext, M09Params } from '../../../types/schema';

export type MazeEdge = 'top' | 'right' | 'bottom' | 'left';

export interface MazeCell {
  readonly row: number;
  readonly col: number;
}

export interface MazeData {
  readonly gridSize: number;
  /**
   * horizontalWalls[r][c]: セル (r-1, c) と (r, c) の間の水平壁 (0 <= r <= N, 0 <= c < N)
   * r = 0 は上外壁、r = N は下外壁
   */
  readonly horizontalWalls: readonly (readonly boolean[])[];
  /**
   * verticalWalls[r][c]: セル (r, c-1) と (r, c) の間の垂直壁 (0 <= r < N, 0 <= c <= N)
   * c = 0 は左外壁、c = N は右外壁
   */
  readonly verticalWalls: readonly (readonly boolean[])[];
  readonly start: MazeCell;
  readonly goal: MazeCell;
  readonly startEdge: MazeEdge;
  readonly goalEdge: MazeEdge;
  readonly solutionPath: readonly MazeCell[];
}

interface WallItem {
  readonly r1: number;
  readonly c1: number;
  readonly r2: number;
  readonly c2: number;
}

/**
 * route 設定に応じた start, goal, 開口部エッジを取得する
 */
export function getRouteEndpoints(route: M09Params['route'], gridSize: number): {
  start: MazeCell;
  goal: MazeCell;
  startEdge: MazeEdge;
  goalEdge: MazeEdge;
} {
  const mid = Math.floor(gridSize / 2);
  switch (route) {
    case 'tlToBr':
      return {
        start: { row: 0, col: 0 },
        goal: { row: gridSize - 1, col: gridSize - 1 },
        startEdge: 'left',
        goalEdge: 'right',
      };
    case 'trToBl':
      return {
        start: { row: 0, col: gridSize - 1 },
        goal: { row: gridSize - 1, col: 0 },
        startEdge: 'right',
        goalEdge: 'left',
      };
    case 'rightToLeft':
      return {
        start: { row: mid, col: gridSize - 1 },
        goal: { row: mid, col: 0 },
        startEdge: 'right',
        goalEdge: 'left',
      };
    case 'leftToRight':
      return {
        start: { row: mid, col: 0 },
        goal: { row: mid, col: gridSize - 1 },
        startEdge: 'left',
        goalEdge: 'right',
      };
  }
}

/**
 * 2セル間に壁があるかどうかを判定する
 */
export function hasWallBetween(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  hWalls: readonly (readonly boolean[])[],
  vWalls: readonly (readonly boolean[])[],
): boolean {
  if (r1 === r2) {
    if (Math.abs(c1 - c2) !== 1) return true;
    const minC = Math.min(c1, c2);
    const row = vWalls[r1];
    return row !== undefined ? (row[minC + 1] ?? true) : true;
  } else if (c1 === c2) {
    if (Math.abs(r1 - r2) !== 1) return true;
    const minR = Math.min(r1, r2);
    const row = hWalls[minR + 1];
    return row !== undefined ? (row[c1] ?? true) : true;
  }
  return true;
}

/**
 * 迷路生成主ロジック
 */
export function generateMaze(ctx: GenerateContext, params: M09Params): MazeData {
  const N = params.gridSize;
  const endpoints = getRouteEndpoints(params.route, N);

  // フラットな Uint8Array で壁を管理（1: 壁あり, 0: 通路）
  // 水平壁: (N + 1) * N
  const hFlat = new Uint8Array((N + 1) * N).fill(1);
  // 垂直壁: N * (N + 1)
  const vFlat = new Uint8Array(N * (N + 1)).fill(1);

  const openHorizontal = (r: number, c: number): void => {
    hFlat[r * N + c] = 0;
  };
  const openVertical = (r: number, c: number): void => {
    vFlat[r * (N + 1) + c] = 0;
  };

  const openWall = (r1: number, c1: number, r2: number, c2: number): void => {
    if (r1 === r2) {
      openVertical(r1, Math.min(c1, c2) + 1);
    } else if (c1 === c2) {
      openHorizontal(Math.min(r1, r2) + 1, c1);
    }
  };

  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  if (params.algorithm === 'prim') {
    // 乱択 Prim 法（フロンティア配列、非再帰）
    const visited = new Uint8Array(N * N);
    const frontiers: WallItem[] = [];

    const startIndex = endpoints.start.row * N + endpoints.start.col;
    visited[startIndex] = 1;

    for (const d of dirs) {
      const nr = endpoints.start.row + d.dr;
      const nc = endpoints.start.col + d.dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        frontiers.push({ r1: endpoints.start.row, c1: endpoints.start.col, r2: nr, c2: nc });
      }
    }

    while (frontiers.length > 0) {
      const idx = ctx.rng.int(0, frontiers.length - 1);
      const wall = frontiers[idx];
      const last = frontiers[frontiers.length - 1];
      if (wall !== undefined && last !== undefined) {
        frontiers[idx] = last;
      }
      frontiers.pop();
      if (wall === undefined) continue;

      const idx1 = wall.r1 * N + wall.c1;
      const idx2 = wall.r2 * N + wall.c2;
      const v1 = visited[idx1] === 1;
      const v2 = visited[idx2] === 1;

      if (v1 !== v2) {
        const newlyR = v1 ? wall.r2 : wall.r1;
        const newlyC = v1 ? wall.c2 : wall.c1;
        const newIdx = newlyR * N + newlyC;

        openWall(wall.r1, wall.c1, wall.r2, wall.c2);
        visited[newIdx] = 1;

        for (const d of dirs) {
          const nr = newlyR + d.dr;
          const nc = newlyC + d.dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && visited[nr * N + nc] === 0) {
            frontiers.push({ r1: newlyR, c1: newlyC, r2: nr, c2: nc });
          }
        }
      }
    }
  } else {
    // 反復型バックトラッカー（明示的スタック配列、非再帰）
    const visited = new Uint8Array(N * N);
    const stack: MazeCell[] = [{ row: endpoints.start.row, col: endpoints.start.col }];
    visited[endpoints.start.row * N + endpoints.start.col] = 1;

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      if (current === undefined) break;

      const unvisited: MazeCell[] = [];
      for (const d of dirs) {
        const nr = current.row + d.dr;
        const nc = current.col + d.dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && visited[nr * N + nc] === 0) {
          unvisited.push({ row: nr, col: nc });
        }
      }

      if (unvisited.length > 0) {
        const next = ctx.rng.pick(unvisited);
        openWall(current.row, current.col, next.row, next.col);
        visited[next.row * N + next.col] = 1;
        stack.push(next);
      } else {
        stack.pop();
      }
    }
  }

  // 出入口を開く
  if (endpoints.startEdge === 'left') {
    openVertical(endpoints.start.row, 0);
  } else if (endpoints.startEdge === 'right') {
    openVertical(endpoints.start.row, N);
  } else if (endpoints.startEdge === 'top') {
    openHorizontal(0, endpoints.start.col);
  } else if (endpoints.startEdge === 'bottom') {
    openHorizontal(N, endpoints.start.col);
  }

  if (endpoints.goalEdge === 'left') {
    openVertical(endpoints.goal.row, 0);
  } else if (endpoints.goalEdge === 'right') {
    openVertical(endpoints.goal.row, N);
  } else if (endpoints.goalEdge === 'top') {
    openHorizontal(0, endpoints.goal.col);
  } else if (endpoints.goalEdge === 'bottom') {
    openHorizontal(N, endpoints.goal.col);
  }

  // 二次元配列に展開
  const horizontalWalls: boolean[][] = [];
  for (let r = 0; r <= N; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < N; c++) {
      row.push(hFlat[r * N + c] === 1);
    }
    horizontalWalls.push(row);
  }

  const verticalWalls: boolean[][] = [];
  for (let r = 0; r < N; r++) {
    const row: boolean[] = [];
    for (let c = 0; c <= N; c++) {
      row.push(vFlat[r * (N + 1) + c] === 1);
    }
    verticalWalls.push(row);
  }

  // BFS で最短経路を探索
  const visitedBfs = new Uint8Array(N * N);
  const parent = new Int32Array(N * N).fill(-1);
  const startIdx = endpoints.start.row * N + endpoints.start.col;
  const goalIdx = endpoints.goal.row * N + endpoints.goal.col;

  const queue = new Int32Array(N * N);
  let head = 0;
  let tail = 0;

  queue[tail++] = startIdx;
  visitedBfs[startIdx] = 1;

  while (head < tail) {
    const currIdx = queue[head++];
    if (currIdx === undefined) break;
    if (currIdx === goalIdx) break;

    const cr = Math.floor(currIdx / N);
    const cc = currIdx % N;

    for (const d of dirs) {
      const nr = cr + d.dr;
      const nc = cc + d.dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        const nextIdx = nr * N + nc;
        if (visitedBfs[nextIdx] === 0) {
          if (!hasWallBetween(cr, cc, nr, nc, horizontalWalls, verticalWalls)) {
            visitedBfs[nextIdx] = 1;
            parent[nextIdx] = currIdx;
            queue[tail++] = nextIdx;
          }
        }
      }
    }
  }

  // 経路復元
  const solutionPath: MazeCell[] = [];
  let currStep: number = goalIdx;
  while (currStep !== -1) {
    solutionPath.push({
      row: Math.floor(currStep / N),
      col: currStep % N,
    });
    if (currStep === startIdx) break;
    currStep = parent[currStep] ?? -1;
  }
  solutionPath.reverse();

  return {
    gridSize: N,
    horizontalWalls,
    verticalWalls,
    start: endpoints.start,
    goal: endpoints.goal,
    startEdge: endpoints.startEdge,
    goalEdge: endpoints.goalEdge,
    solutionPath,
  };
}
