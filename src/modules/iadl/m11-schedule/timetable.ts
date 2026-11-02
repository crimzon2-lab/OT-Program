/**
 * M11 サブモードB: 逆算タイムスケジュール生成
 * ARCHITECTURE.md §5.3 準拠
 */

import {
  ERRAND_TEMPLATES,
  ORDER_PAIR_TEMPLATES,
} from '../../../data/schedule/errands';
import type {
  ErrandTemplate,
  GenerateContext,
  M11Params,
} from '../../../types/schema';
import {
  formatMinute,
  type Constraint,
  type PlannedItem,
  type TimetableErrand,
  type TimetableProblem,
  verifyPlan,
} from './solver';

const SLOT = 30;

function ceilTo(val: number, step: number): number {
  return Math.ceil(val / step) * step;
}

function floorTo(val: number, step: number): number {
  return Math.floor(val / step) * step;
}

/**
 * 逆算生成アルゴリズムによる1日タイムスケジュール問題の生成
 */
export function generateTimetableProblem(
  params: M11Params,
  ctx: GenerateContext
): TimetableProblem {
  const dayStart = params.dayStartHour * 60;
  const dayEnd = params.dayEndHour * 60;
  let count = Math.max(3, Math.min(6, params.errandCount));

  let successfulPlan: PlannedItem[] | null = null;
  let chosenErrands: { template: ErrandTemplate; duration: number }[] = [];

  const templateMap = new Map<string, ErrandTemplate>(
    ERRAND_TEMPLATES.map((e) => [e.id, e])
  );

  while (count >= 3 && successfulPlan === null) {
    for (let attempt = 1; attempt <= 200; attempt++) {
      // 候補プールの絞り込み
      // kind === 'meal' は最大1、'appointment' は最大1、place 重複なし（自宅は除く）
      const pool = ctx.rng.shuffle([...ERRAND_TEMPLATES]);
      const selected: ErrandTemplate[] = [];
      let mealCount = 0;
      let apptCount = 0;
      const seenPlaces = new Set<string>();

      for (const e of pool) {
        if (e.kind === 'meal') {
          if (mealCount >= 1) continue;
        }
        if (e.kind === 'appointment') {
          if (apptCount >= 1) continue;
        }
        if (e.place !== '自宅' && seenPlaces.has(e.place)) {
          continue;
        }

        selected.push(e);
        if (e.kind === 'meal') mealCount++;
        if (e.kind === 'appointment') apptCount++;
        if (e.place !== '自宅') seenPlaces.add(e.place);

        if (selected.length === count) break;
      }

      if (selected.length < count) continue;

      // 各用事の所要時間を決定
      const selectedWithDur = selected.map((e) => ({
        template: e,
        duration: ctx.rng.pick(e.durationsMin),
      }));

      // 順序をシャッフル
      const order = ctx.rng.shuffle(selectedWithDur);
      let cursor = dayStart;
      let prevPlace = '自宅';
      const plan: PlannedItem[] = [];
      let ok = true;

      for (const item of order) {
        const e = item.template;
        const travel =
          params.includeTravel && e.place !== prevPlace ? e.travelMin : 0;
        const earliest = ceilTo(Math.max(cursor + travel, e.openFromMin), SLOT);
        // ときどき 30 分の空きを入れる
        const extraSlack = ctx.rng.pick([0, 0, 30]);
        const start = earliest + extraSlack;
        const end = start + item.duration;

        if (end > Math.min(e.openToMin, dayEnd)) {
          ok = false;
          break;
        }

        plan.push({
          errandId: e.id,
          label: e.label,
          place: e.place,
          start,
          end,
          travelBefore: travel,
        });

        cursor = end;
        prevPlace = e.place;
      }

      if (ok) {
        successfulPlan = plan;
        chosenErrands = selectedWithDur;
        break;
      }
    }

    if (successfulPlan === null) {
      count -= 1;
      if (count >= 3) {
        ctx.warn(
          'GENERATION_RETRY',
          `条件に合う予定が組めなかったため用事を ${count} 件に減らしました`
        );
      }
    }
  }

  if (successfulPlan === null) {
    throw new Error('Failed to generate timetable schedule within constraints');
  }

  const plan = successfulPlan;
  const planMap = new Map(plan.map((p) => [p.errandId, p]));

  // --- 条件抽出：すべて plan が満たすものだけを作る ---
  const constraints: Constraint[] = [];
  let condIndex = 1;

  for (const item of plan) {
    const e = templateMap.get(item.errandId)!;
    if (e.kind === 'appointment') {
      constraints.push({
        id: `c-${condIndex++}`,
        kind: 'fixed',
        errandId: item.errandId,
        start: item.start,
        label: `${e.label}の予約時間は ${formatMinute(item.start)} 開始`,
      });
    } else if (e.openFromMin > dayStart || e.openToMin < dayEnd) {
      const from = Math.max(e.openFromMin, dayStart);
      const to = Math.min(e.openToMin, dayEnd);
      constraints.push({
        id: `c-${condIndex++}`,
        kind: 'window',
        errandId: item.errandId,
        from,
        to,
        label: `${e.label}（${e.place}）の利用可能時間は ${formatMinute(from)}〜${formatMinute(to)}`,
      });
    }
  }

  // 難易度に応じた制約追加
  const level = params.constraintLevel;
  const numOrders = level === 'hard' ? 2 : level === 'normal' ? 1 : 0;

  // order 条件の抽出
  // ORDER_PAIR_TEMPLATES のうち両方が plan にあり、かつ plan で before.end <= after.start のもの
  const matchingOrderPairs = ORDER_PAIR_TEMPLATES.filter((op) => {
    const b = planMap.get(op.beforeId);
    const a = planMap.get(op.afterId);
    return b !== undefined && a !== undefined && b.end <= a.start;
  });

  const usedOrderIds = new Set<string>();

  for (let i = 0; i < numOrders; i++) {
    const unusedPairs = matchingOrderPairs.filter(
      (op) => !usedOrderIds.has(op.id)
    );
    if (unusedPairs.length > 0) {
      const picked = ctx.rng.pick(unusedPairs);
      usedOrderIds.add(picked.id);
      const b = templateMap.get(picked.beforeId)!;
      const a = templateMap.get(picked.afterId)!;
      constraints.push({
        id: `c-${condIndex++}`,
        kind: 'order',
        beforeId: picked.beforeId,
        afterId: picked.afterId,
        label: `${b.label}を終えてから、${a.label}を行う（${picked.reason}）`,
      });
    } else {
      // テンプレートになければ、plan 内の順序からペアを作る
      const candidatePairs: { b: PlannedItem; a: PlannedItem }[] = [];
      for (let j = 0; j < plan.length - 1; j++) {
        for (let k = j + 1; k < plan.length; k++) {
          const itemJ = plan[j];
          const itemK = plan[k];
          if (itemJ && itemK && itemJ.end <= itemK.start) {
            candidatePairs.push({ b: itemJ, a: itemK });
          }
        }
      }
      if (candidatePairs.length > 0) {
        const p = ctx.rng.pick(candidatePairs);
        constraints.push({
          id: `c-${condIndex++}`,
          kind: 'order',
          beforeId: p.b.errandId,
          afterId: p.a.errandId,
          label: `${p.b.label}を終えてから、${p.a.label}を行う`,
        });
      }
    }
  }

  // hard の場合、deadline または notBefore を 1件追加
  if (level === 'hard') {
    const isDeadline = ctx.rng.chance(0.5);
    const randomItem = ctx.rng.pick(plan);
    const e = templateMap.get(randomItem.errandId)!;

    if (isDeadline) {
      const by = Math.min(dayEnd, ceilTo(randomItem.end, 60));
      constraints.push({
        id: `c-${condIndex++}`,
        kind: 'deadline',
        errandId: randomItem.errandId,
        by,
        label: `${e.label}は ${formatMinute(by)} までに終える`,
      });
    } else {
      const after = Math.max(dayStart, floorTo(randomItem.start, 60));
      constraints.push({
        id: `c-${condIndex++}`,
        kind: 'notBefore',
        errandId: randomItem.errandId,
        after,
        label: `${e.label}は ${formatMinute(after)} 以降に行う`,
      });
    }
  }

  const errandsList: TimetableErrand[] = chosenErrands.map((ce) => ({
    id: ce.template.id,
    label: ce.template.label,
    place: ce.template.place,
    duration: ce.duration,
    travelMin: ce.template.travelMin,
  }));

  const problem: TimetableProblem = {
    dayStart,
    dayEnd,
    slot: SLOT,
    includeTravel: params.includeTravel,
    errands: errandsList,
    constraints,
    solution: plan,
  };

  // --- 検証（必須・不合格はバグのため throw） ---
  const verifyResults = verifyPlan(problem, plan);
  const failed = verifyResults.filter((r) => !r.ok);
  if (failed.length > 0) {
    throw new Error(
      `Solver assertion failed: ${failed.map((f) => f.constraintId).join(', ')}`
    );
  }

  return problem;
}
