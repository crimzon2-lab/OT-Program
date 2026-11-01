/**
 * M02 TMT様課題 生成ロジック
 * ARCHITECTURE.md §5.1(e), §8, §9 準拠
 */

import {
  HIRAGANA_SEION,
  type CommonParams,
  type GenerateContext,
  type M02Params,
} from '../../../types/schema';
import { dist, type Rect } from '../../../utils/geometry';
import { placeUniform, type ExistingPoint } from '../../../utils/placement';

export interface TmtNode {
  readonly id: number; // 0-based sequence index
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly isStart: boolean;
  readonly isEnd: boolean;
  readonly isPractice: boolean;
}

export interface TmtProblemData {
  readonly mainNodes: readonly TmtNode[];
  readonly practiceNodes: readonly TmtNode[];
  readonly effectiveDiameter: number;
  readonly practiceDiameter: number;
  readonly practiceHeight: number;
  readonly mainArea: Rect;
  readonly pathSequence: string;
}

/**
 * M02（TMT様課題）のノード配置・ラベル列・練習枠を生成する。
 */
export function generateM02Data(
  ctx: GenerateContext,
  params: M02Params & CommonParams,
): TmtProblemData {
  const textScale = params.textScale ?? 100;
  const effectiveDiameter = params.nodeDiameterMm * (textScale / 100);
  const minGap = Math.max(8, effectiveDiameter * 0.8);
  const r = effectiveDiameter / 2;

  // 「開始」「終了」ラベル用の余白半径（半径 + 6mm）
  const rSpecial = r + 6;

  // 練習枠の高さ（practice === true 時は上部 38mm）
  const practiceHeight = params.practice ? 38 : 0;
  const mainArea: Rect = {
    x: 0,
    y: practiceHeight,
    w: ctx.body.widthMm,
    h: Math.max(10, ctx.body.heightMm - practiceHeight),
  };

  // 1) 練習ノードの生成（5ノード固定）
  const practiceNodes: TmtNode[] = [];
  const kanaChars = Array.from(HIRAGANA_SEION);

  // 練習ノード径は textScale 200% でも 38mm 枠内に安全に収まるよう上限 10mm
  const practiceDiameter = Math.min(effectiveDiameter, 10);

  if (params.practice) {
    const practiceLabels =
      params.part === 'A'
        ? ['1', '2', '3', '4', '5']
        : ['1', kanaChars[0]!, '2', kanaChars[1]!, '3'];

    const startX = 45;
    const endX = ctx.body.widthMm - 20;
    const stepX = (endX - startX) / 4;

    for (let i = 0; i < 5; i++) {
      const px = startX + i * stepX;
      // 軽いジグザグ配置でTMTの探索特性を模す
      const py = 19 + (i % 2 === 0 ? -4 : 4);
      practiceNodes.push({
        id: i,
        x: px,
        y: py,
        label: practiceLabels[i]!,
        isStart: i === 0,
        isEnd: i === 4,
        isPractice: true,
      });
    }
  }

  // 2) 本課題ノードの配置
  let targetCount = params.nodeCount;
  if (params.part === 'B' && targetCount % 2 !== 0) {
    targetCount -= 1;
  }

  // 配置試行関数
  const tryPlacement = (rngForkKey: string) => {
    const rng = ctx.rng.fork(rngForkKey);

    // 開始ノード（ノード1）の配置
    // 「開始」ラベルが用紙下部に見切れないよう、yの下限に rSpecial を考慮
    const startX = rng.float(mainArea.x + rSpecial, mainArea.x + mainArea.w - rSpecial);
    const startY = rng.float(mainArea.y + rSpecial, mainArea.y + mainArea.h - rSpecial);
    const pStart = { x: startX, y: startY };

    // 終了ノード（最終ノード）の配置：開始ノードと十分離れた位置
    let pEnd = {
      x: rng.float(mainArea.x + rSpecial, mainArea.x + mainArea.w - rSpecial),
      y: rng.float(mainArea.y + rSpecial, mainArea.y + mainArea.h - rSpecial),
    };
    const minStartEndDist = 2 * (rSpecial + r) + minGap;

    for (let attempt = 0; attempt < 20; attempt++) {
      if (dist(pStart, pEnd) >= minStartEndDist) break;
      pEnd = {
        x: rng.float(mainArea.x + rSpecial, mainArea.x + mainArea.w - rSpecial),
        y: rng.float(mainArea.y + rSpecial, mainArea.y + mainArea.h - rSpecial),
      };
    }

    const existing: ExistingPoint[] = [
      { x: pStart.x, y: pStart.y, r: rSpecial },
      { x: pEnd.x, y: pEnd.y, r: rSpecial },
    ];

    const unif = placeUniform(
      rng.fork('middle'),
      mainArea,
      targetCount - 2,
      effectiveDiameter,
      minGap,
      existing,
    );

    return {
      pStart,
      pEnd,
      middle: unif.points.map((p) => ({ x: p.x, y: p.y })),
    };
  };

  // 最大2回のリトライ（ARCHITECTURE.md §5.1(e)）
  let best = tryPlacement('placement');
  if (best.middle.length < targetCount - 2) {
    const retry1 = tryPlacement('retry-1');
    if (retry1.middle.length > best.middle.length) {
      best = retry1;
    }
  }
  if (best.middle.length < targetCount - 2) {
    const retry2 = tryPlacement('retry-2');
    if (retry2.middle.length > best.middle.length) {
      best = retry2;
    }
  }

  // 打ち切り調整
  let finalTotal = 2 + best.middle.length;
  if (params.part === 'B' && finalTotal % 2 !== 0) {
    finalTotal -= 1;
  }
  const finalMiddle = best.middle.slice(0, finalTotal - 2);

  if (finalTotal < targetCount) {
    ctx.warn(
      'PLACEMENT_TRUNCATED',
      `ノード数を ${targetCount} → ${finalTotal} に調整しました（用紙領域またはノードサイズの上限に達したため）`,
    );
  }

  // 3) 順序最適化（連続番号ノード間の距離が離れるよう並び替え）
  let bestOrderedMiddle = [...finalMiddle];
  let maxMinStepDist = -1;

  // シャッフル試行（最大30回）
  const shuffleRng = ctx.rng.fork('order-opt');
  for (let s = 0; s < 30; s++) {
    const cand = s === 0 ? [...finalMiddle] : shuffleRng.shuffle([...finalMiddle]);
    const fullPoints = [best.pStart, ...cand, best.pEnd];
    let minStepDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < fullPoints.length - 1; i++) {
      const d = dist(fullPoints[i]!, fullPoints[i + 1]!);
      if (d < minStepDist) minStepDist = d;
    }
    if (minStepDist > maxMinStepDist) {
      maxMinStepDist = minStepDist;
      bestOrderedMiddle = cand;
    }
  }

  const allMainPoints = [best.pStart, ...bestOrderedMiddle, best.pEnd];

  // 4) ラベル列の生成
  const mainLabels: string[] = [];
  if (params.part === 'A') {
    for (let i = 1; i <= finalTotal; i++) {
      mainLabels.push(String(i));
    }
  } else {
    for (let i = 0; i < finalTotal; i++) {
      if (i % 2 === 0) {
        mainLabels.push(String(1 + Math.floor(i / 2)));
      } else {
        mainLabels.push(kanaChars[Math.floor(i / 2)]!);
      }
    }
  }

  const mainNodes: TmtNode[] = allMainPoints.map((pt, i) => ({
    id: i,
    x: pt.x,
    y: pt.y,
    label: mainLabels[i]!,
    isStart: i === 0,
    isEnd: i === finalTotal - 1,
    isPractice: false,
  }));

  const pathSequence = mainLabels.join(' → ');

  return {
    mainNodes,
    practiceNodes,
    effectiveDiameter,
    practiceDiameter,
    practiceHeight,
    mainArea,
    pathSequence,
  };
}
