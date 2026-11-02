/**
 * M11 サブモードB: タイムスケジュール制約検証ソルバ
 * ARCHITECTURE.md §5.3 準拠
 */

export interface PlannedItem {
  errandId: string;
  label: string;
  place: string;
  start: number; // 0:00 からの分
  end: number;   // 0:00 からの分
  travelBefore: number; // 移動時間（分・0 または 30）
}

export type Constraint =
  | { id: string; kind: 'window'; errandId: string; from: number; to: number; label: string }
  | { id: string; kind: 'fixed'; errandId: string; start: number; label: string }
  | { id: string; kind: 'deadline'; errandId: string; by: number; label: string }
  | { id: string; kind: 'notBefore'; errandId: string; after: number; label: string }
  | { id: string; kind: 'order'; beforeId: string; afterId: string; label: string };

export interface TimetableErrand {
  id: string;
  label: string;
  place: string;
  duration: number;
  travelMin: number;
}

export interface TimetableProblem {
  dayStart: number;
  dayEnd: number;
  slot: 30;
  includeTravel: boolean;
  errands: TimetableErrand[];
  constraints: Constraint[];
  solution: PlannedItem[];
}

export interface VerificationResult {
  constraintId: string;
  ok: boolean;
  label: string;
}

/**
 * 分を "HH:MM" 形式の時刻文字列に変換する
 */
export function formatMinute(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm}`;
}

/**
 * スケジュール計画がすべての一般条件および個別制約を満たしているか検証する
 * （患者の解答採点にもそのまま使用可能）
 */
export function verifyPlan(
  problem: TimetableProblem,
  plan: readonly PlannedItem[]
): VerificationResult[] {
  const results: VerificationResult[] = [];

  // --- 一般条件 1: 全用事が 1 回ずつ入っている ---
  const planErrandIds = plan.map((p) => p.errandId);
  const planErrandSet = new Set(planErrandIds);
  const allOnce =
    planErrandIds.length === problem.errands.length &&
    planErrandSet.size === problem.errands.length &&
    problem.errands.every((e) => planErrandSet.has(e.id));

  results.push({
    constraintId: 'gen-all-errands',
    ok: allOnce,
    label: '予定されている用事がすべて1回ずつ入っている',
  });

  // start 昇順にソートしたコピーで時間重複や移動時間を検証
  const sortedPlan = [...plan].sort((a, b) => a.start - b.start);

  // --- 一般条件 2: 時間帯（dayStart〜dayEnd）に収まっている ---
  const inRange = sortedPlan.every(
    (item) => item.start >= problem.dayStart && item.end <= problem.dayEnd
  );
  results.push({
    constraintId: 'gen-time-range',
    ok: inRange,
    label: `${formatMinute(problem.dayStart)}〜${formatMinute(problem.dayEnd)}の活動時間内に収まっている`,
  });

  // --- 一般条件 3: 各用事の所要時間が正しい ---
  const errandMap = new Map(problem.errands.map((e) => [e.id, e]));
  const durationOk = sortedPlan.every((item) => {
    const e = errandMap.get(item.errandId);
    return e !== undefined && item.end - item.start === e.duration;
  });
  results.push({
    constraintId: 'gen-duration',
    ok: durationOk,
    label: '各用事の所要時間（時間幅）が正しい',
  });

  // --- 一般条件 4 & 5: 時間重複がなく、移動時間が確保されている ---
  let noOverlap = true;
  let travelOk = true;
  let prevEnd = problem.dayStart;
  let prevPlace = '自宅';

  for (let i = 0; i < sortedPlan.length; i++) {
    const item = sortedPlan[i];
    if (!item) continue;

    const e = errandMap.get(item.errandId);
    const expectedTravel =
      problem.includeTravel && e && e.place !== prevPlace ? e.travelMin : 0;

    const prevItem = sortedPlan[i - 1];
    if (i > 0 && prevItem && item.start < prevItem.end) {
      noOverlap = false;
    }
    if (item.start < prevEnd + expectedTravel) {
      travelOk = false;
    }
    if (problem.includeTravel && item.travelBefore < expectedTravel) {
      travelOk = false;
    }

    prevEnd = item.end;
    prevPlace = item.place;
  }

  results.push({
    constraintId: 'gen-no-overlap',
    ok: noOverlap,
    label: '用事同士の時間が重なっていない',
  });

  if (problem.includeTravel) {
    results.push({
      constraintId: 'gen-travel',
      ok: travelOk,
      label: '場所が変わる際の移動時間（30分）が確保されている',
    });
  }

  // --- 個別条件の判定 ---
  const planItemMap = new Map(plan.map((p) => [p.errandId, p]));

  for (const c of problem.constraints) {
    let ok = false;

    switch (c.kind) {
      case 'window': {
        const item = planItemMap.get(c.errandId);
        if (item) {
          ok = item.start >= c.from && item.end <= c.to;
        }
        break;
      }
      case 'fixed': {
        const item = planItemMap.get(c.errandId);
        if (item) {
          ok = item.start === c.start;
        }
        break;
      }
      case 'deadline': {
        const item = planItemMap.get(c.errandId);
        if (item) {
          ok = item.end <= c.by;
        }
        break;
      }
      case 'notBefore': {
        const item = planItemMap.get(c.errandId);
        if (item) {
          ok = item.start >= c.after;
        }
        break;
      }
      case 'order': {
        const beforeItem = planItemMap.get(c.beforeId);
        const afterItem = planItemMap.get(c.afterId);
        if (beforeItem && afterItem) {
          ok = beforeItem.end <= afterItem.start;
        }
        break;
      }
    }

    results.push({
      constraintId: c.id,
      ok,
      label: c.label,
    });
  }

  return results;
}
