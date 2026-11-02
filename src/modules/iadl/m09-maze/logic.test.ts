/**
 * M09: 迷路・ルート探索 ロジック単体テスト
 * ARCHITECTURE.md §5.6, §11.3 準拠
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { M09Params } from '../../../types/schema';
import { generateMaze, hasWallBetween } from './logic';

describe('M09 迷路・ルート探索ロジック', () => {
  const defaultParams: M09Params = {
    gridSize: 12,
    route: 'tlToBr',
    algorithm: 'backtracker',
    orientation: 'portrait',
  };

  it('バックトラッカー方式で有効な解経路が生成されること', () => {
    const { ctx } = makeTestContext({ seed: 12345 });
    const maze = generateMaze(ctx, defaultParams);

    expect(maze.gridSize).toBe(12);
    expect(maze.solutionPath.length).toBeGreaterThanOrEqual(12);

    // 先頭が start、末尾が goal
    const first = maze.solutionPath[0];
    const last = maze.solutionPath[maze.solutionPath.length - 1];
    expect(first).toEqual(maze.start);
    expect(last).toEqual(maze.goal);

    // 連続する2セルが隣接し、間の壁が開いていること
    for (let i = 0; i < maze.solutionPath.length - 1; i++) {
      const c1 = maze.solutionPath[i]!;
      const c2 = maze.solutionPath[i + 1]!;
      const dist = Math.abs(c1.row - c2.row) + Math.abs(c1.col - c2.col);
      expect(dist).toBe(1);

      const hasWall = hasWallBetween(
        c1.row,
        c1.col,
        c2.row,
        c2.col,
        maze.horizontalWalls,
        maze.verticalWalls,
      );
      expect(hasWall).toBe(false);
    }

    // 重複セルがないこと（単純路）
    const visitedSet = new Set(maze.solutionPath.map((c) => `${c.row},${c.col}`));
    expect(visitedSet.size).toBe(maze.solutionPath.length);
  });

  it('Prim 法で有効な解経路が生成されること', () => {
    const { ctx } = makeTestContext({ seed: 54321 });
    const maze = generateMaze(ctx, { ...defaultParams, algorithm: 'prim' });

    expect(maze.solutionPath.length).toBeGreaterThanOrEqual(12);
    expect(maze.solutionPath[0]).toEqual(maze.start);
    expect(maze.solutionPath[maze.solutionPath.length - 1]).toEqual(maze.goal);

    for (let i = 0; i < maze.solutionPath.length - 1; i++) {
      const c1 = maze.solutionPath[i]!;
      const c2 = maze.solutionPath[i + 1]!;
      const dist = Math.abs(c1.row - c2.row) + Math.abs(c1.col - c2.col);
      expect(dist).toBe(1);

      const hasWall = hasWallBetween(
        c1.row,
        c1.col,
        c2.row,
        c2.col,
        maze.horizontalWalls,
        maze.verticalWalls,
      );
      expect(hasWall).toBe(false);
    }
  });

  it('全4種類の route で start/goal および解経路が正しく接続されること', () => {
    const routes: M09Params['route'][] = ['tlToBr', 'trToBl', 'rightToLeft', 'leftToRight'];

    for (const route of routes) {
      const { ctx } = makeTestContext({ seed: 999 });
      const maze = generateMaze(ctx, { ...defaultParams, route, gridSize: 10 });

      expect(maze.solutionPath[0]).toEqual(maze.start);
      expect(maze.solutionPath[maze.solutionPath.length - 1]).toEqual(maze.goal);

      // rightToLeft の左側探索誘導の座標確認
      if (route === 'rightToLeft') {
        expect(maze.start).toEqual({ row: 5, col: 9 });
        expect(maze.goal).toEqual({ row: 5, col: 0 });
        expect(maze.startEdge).toBe('right');
        expect(maze.goalEdge).toBe('left');
      }
    }
  });

  it('完全迷路の木構造特性（全セル連結、閉路なし、開通内部壁の数 = N*N - 1）を満たすこと', () => {
    const N = 8;
    const { ctx } = makeTestContext({ seed: 777 });
    const maze = generateMaze(ctx, { ...defaultParams, gridSize: N });

    // 内部で開いている壁の数をカウント
    let openInternalWalls = 0;

    // 水平内部壁: r = 1..N-1
    for (let r = 1; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!maze.horizontalWalls[r]![c]) {
          openInternalWalls++;
        }
      }
    }

    // 垂直内部壁: c = 1..N-1
    for (let r = 0; r < N; r++) {
      for (let c = 1; c < N; c++) {
        if (!maze.verticalWalls[r]![c]) {
          openInternalWalls++;
        }
      }
    }

    // N*N セルの木構造の辺の数はちょうど N*N - 1
    expect(openInternalWalls).toBe(N * N - 1);
  });

  it('最大サイズ 25x25 でもスタックオーバーフローせず高速に生成できること', () => {
    const { ctx } = makeTestContext({ seed: 2525 });
    const t0 = performance.now();
    const maze = generateMaze(ctx, { ...defaultParams, gridSize: 25, algorithm: 'backtracker' });
    const elapsed = performance.now() - t0;

    expect(maze.gridSize).toBe(25);
    expect(maze.solutionPath[0]).toEqual(maze.start);
    expect(maze.solutionPath[maze.solutionPath.length - 1]).toEqual(maze.goal);
    expect(elapsed).toBeLessThan(500); // 500ms 未満で完了
  });

  it('同一シード・パラメータで完全に決定的な出力が得られること', () => {
    const { ctx: ctx1 } = makeTestContext({ seed: 42 });
    const maze1 = generateMaze(ctx1, defaultParams);

    const { ctx: ctx2 } = makeTestContext({ seed: 42 });
    const maze2 = generateMaze(ctx2, defaultParams);

    expect(maze1.solutionPath).toEqual(maze2.solutionPath);
    expect(maze1.horizontalWalls).toEqual(maze2.horizontalWalls);
    expect(maze1.verticalWalls).toEqual(maze2.verticalWalls);
  });
});
