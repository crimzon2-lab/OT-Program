/**
 * M01 抹消課題 生成ロジック
 * ARCHITECTURE.md §5.1, §8, §9 準拠
 */

import { getCancellationSymbols } from '../../../data/symbols';
import {
  STIMULUS_CHARSETS,
  type CommonParams,
  type GenerateContext,
  type M01Params,
  type Quadrant,
  type QuadrantStats,
  type SymbolDef,
} from '../../../types/schema';
import { computeQuadrantStats, type Rect } from '../../../utils/geometry';
import { gridLayout, placeStratified, placeUniform } from '../../../utils/placement';

export interface M01Item {
  readonly x: number;
  readonly y: number;
  readonly quadrant: Quadrant;
  readonly isTarget: boolean;
  readonly value: string | SymbolDef;
}

export interface M01ProblemData {
  readonly items: readonly M01Item[];
  readonly targets: readonly (string | SymbolDef)[];
  readonly quadrantStats: QuadrantStats;
  readonly sampleHeight: number;
  readonly area: Rect;
  readonly effectiveCharSize: number;
  readonly drawCharSize: number;
}

/**
 * M01（抹消課題）の刺激配置およびターゲット割り当てを生成する。
 */
export function generateM01Data(
  ctx: GenerateContext,
  params: M01Params & CommonParams,
): M01ProblemData {
  const textScale = params.textScale ?? 100;
  const effectiveCharSize = params.charSizeMm * (textScale / 100);

  // 見本帯の高さ（showTargetSample === true 時は上部に charSize + 8 mm）
  const sampleHeight = params.showTargetSample ? effectiveCharSize + 8 : 0;

  // 刺激配置可能領域
  const area: Rect = {
    x: 0,
    y: sampleHeight,
    w: ctx.body.widthMm,
    h: Math.max(10, ctx.body.heightMm - sampleHeight),
  };

  // 1) 刺激プールとターゲット選定
  let targets: (string | SymbolDef)[];
  let decoys: (string | SymbolDef)[];

  if (params.stimulusType === 'shape') {
    const symbolPool = getCancellationSymbols();
    const targetCount = Math.max(1, Math.min(params.targetKinds, symbolPool.length));
    targets = ctx.rng.fork('targets').sample(symbolPool, targetCount);
    const targetIds = new Set(targets.map((t) => (t as SymbolDef).id));
    decoys = symbolPool.filter((s) => !targetIds.has(s.id));
  } else {
    const charset = STIMULUS_CHARSETS[params.stimulusType];
    const chars = Array.from(charset);
    const targetCount = Math.max(1, Math.min(params.targetKinds, chars.length));
    targets = ctx.rng.fork('targets').sample(chars, targetCount);
    const targetSet = new Set(targets as string[]);
    decoys = chars.filter((c) => !targetSet.has(c));
  }

  // 2) 座標配置の計算
  let points: { x: number; y: number; quadrant: Quadrant }[] = [];
  let drawCharSize = effectiveCharSize;

  if (params.layout === 'scatter') {
    const minGap = Math.max(2, effectiveCharSize * 0.25);

    if (params.quadrantBalance) {
      let roundedTotal = Math.floor(params.totalStimuli / 4) * 4;
      if (roundedTotal <= 0) roundedTotal = 4;
      if (roundedTotal !== params.totalStimuli) {
        ctx.warn(
          'COUNT_ROUNDED',
          `総刺激数を ${params.totalStimuli} → ${roundedTotal} に調整しました（4象限均等のため）`,
        );
      }
      const perQuadrant = roundedTotal / 4;
      const stratRes = placeStratified(
        ctx.rng.fork('placement'),
        area,
        perQuadrant,
        effectiveCharSize,
        minGap,
      );

      if (stratRes.truncated) {
        ctx.warn(
          'PLACEMENT_TRUNCATED',
          `総刺激数を ${roundedTotal} → ${stratRes.points.length} に調整しました（文字サイズに対して領域が不足しているため）`,
        );
      }
      points = [...stratRes.points];
    } else {
      const unifRes = placeUniform(
        ctx.rng.fork('placement'),
        area,
        params.totalStimuli,
        effectiveCharSize,
        minGap,
      );

      if (unifRes.truncated) {
        ctx.warn(
          'PLACEMENT_TRUNCATED',
          `総刺激数を ${params.totalStimuli} → ${unifRes.points.length} に調整しました（文字サイズに対して領域が不足しているため）`,
        );
      }
      points = [...unifRes.points];
    }
  } else {
    // layout === 'grid'
    const cellMin = effectiveCharSize + 1.5;
    const gridRes = gridLayout(area, params.totalStimuli, cellMin, params.quadrantBalance);

    if (gridRes.rounded) {
      ctx.warn(
        'COUNT_ROUNDED',
        `グリッド配置のため総刺激数を ${params.totalStimuli} → ${gridRes.points.length} に調整しました`,
      );
    }

    // セル寸法に対する文字サイズの収まりチェック
    if (gridRes.cols > 0 && gridRes.rows > 0) {
      const cellW = area.w / gridRes.cols;
      const cellH = area.h / gridRes.rows;
      const minCellDim = Math.min(cellW, cellH);
      if (minCellDim < effectiveCharSize) {
        drawCharSize = Math.max(3, minCellDim * 0.85);
        ctx.warn(
          'LAYOUT_SCALED',
          `グリッドセル内に収めるため刺激サイズを ${effectiveCharSize.toFixed(1)}mm → ${drawCharSize.toFixed(1)}mm に縮小しました`,
        );
      }
    }
    points = [...gridRes.points];
  }

  // 3) ターゲットと妨害刺激の割り当て
  const items: M01Item[] = [];
  const numTargetKinds = targets.length;

  if (params.quadrantBalance) {
    const quadrants: Quadrant[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    for (const q of quadrants) {
      const quadPoints = points.filter((p) => p.quadrant === q);
      const n = quadPoints.length;
      if (n === 0) continue;

      let tCount = Math.round((n * params.targetRate) / 100);
      if (n >= numTargetKinds) {
        tCount = Math.max(numTargetKinds, tCount);
        if (n > numTargetKinds) {
          tCount = Math.min(n - 1, tCount);
        }
      } else {
        tCount = n;
      }

      const quadIndices = quadPoints.map((_, i) => i);
      const targetIndicesInQuad = new Set(
        ctx.rng.fork(`targets-${q}`).sample(quadIndices, tCount),
      );

      // 全ターゲット種をスロットに均等配分
      const targetSlots: (string | SymbolDef)[] = [];
      for (let i = 0; i < tCount; i++) {
        targetSlots.push(targets[i % numTargetKinds]!);
      }
      const shuffledTargetSlots = ctx.rng.fork(`target-kinds-${q}`).shuffle(targetSlots);

      let slotIdx = 0;
      for (let i = 0; i < n; i++) {
        const pt = quadPoints[i]!;
        if (targetIndicesInQuad.has(i)) {
          const val = shuffledTargetSlots[slotIdx++]!;
          items.push({ x: pt.x, y: pt.y, quadrant: q, isTarget: true, value: val });
        } else {
          const val = ctx.rng.fork(`decoys-${q}-${i}`).pick(decoys);
          items.push({ x: pt.x, y: pt.y, quadrant: q, isTarget: false, value: val });
        }
      }
    }
  } else {
    const n = points.length;
    let tCount = Math.round((n * params.targetRate) / 100);
    if (n >= numTargetKinds) {
      tCount = Math.max(numTargetKinds, tCount);
      if (n > numTargetKinds) {
        tCount = Math.min(n - 1, tCount);
      }
    } else {
      tCount = n;
    }

    const allIndices = points.map((_, i) => i);
    const targetIndices = new Set(
      ctx.rng.fork('targets-uniform').sample(allIndices, tCount),
    );

    const targetSlots: (string | SymbolDef)[] = [];
    for (let i = 0; i < tCount; i++) {
      targetSlots.push(targets[i % numTargetKinds]!);
    }
    const shuffledTargetSlots = ctx.rng.fork('target-kinds-uniform').shuffle(targetSlots);

    let slotIdx = 0;
    for (let i = 0; i < n; i++) {
      const pt = points[i]!;
      if (targetIndices.has(i)) {
        const val = shuffledTargetSlots[slotIdx++]!;
        items.push({ x: pt.x, y: pt.y, quadrant: pt.quadrant, isTarget: true, value: val });
      } else {
        const val = ctx.rng.fork(`decoys-uniform-${i}`).pick(decoys);
        items.push({ x: pt.x, y: pt.y, quadrant: pt.quadrant, isTarget: false, value: val });
      }
    }
  }

  // 4) 実配置結果から4象限集計を算出
  const quadrantStats = computeQuadrantStats(items, area);

  return {
    items,
    targets,
    quadrantStats,
    sampleHeight,
    area,
    effectiveCharSize,
    drawCharSize,
  };
}
