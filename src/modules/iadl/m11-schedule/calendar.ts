/**
 * M11 サブモードA: 月間カレンダーの読み取り・予定記入・質問逆算生成
 * ARCHITECTURE.md §5.6, §8 準拠
 */

import { CALENDAR_EVENT_TEMPLATES } from '../../../data/schedule/calendar-events';
import type {
  CalendarRuleKind,
  GenerateContext,
  M11Params,
  Weekday,
} from '../../../types/schema';
import { WEEKDAY_LABELS } from '../../../types/schema';

export interface CalendarEventEntry {
  templateId: string;
  label: string;
  shortLabel: string;
}

export interface CalendarCell {
  day: number; // 1..daysInMonth, 0 は余白セル
  weekday: Weekday;
  events: CalendarEventEntry[];
}

export interface CalendarCondition {
  id: string;
  text: string;
  templateId: string;
  ruleKind: CalendarRuleKind;
  targetDays: number[];
}

export interface CalendarQuestion {
  id: string;
  questionText: string;
  answerText: string;
}

export interface CalendarProblem {
  year: number;
  month: number;
  daysInMonth: number;
  weekStart: 'sun' | 'mon';
  firstDayOfWeek: Weekday;
  rows: CalendarCell[][];
  conditions: CalendarCondition[];
  questions: CalendarQuestion[];
}

/**
 * 年月に対する実日数を算出する（閏年対応）
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 年月の初日の曜日を算出する（0=日..6=土）
 */
export function getFirstDayOfWeek(year: number, month: number): Weekday {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay() as Weekday;
}

const RELATIVE_K_CANDIDATES = [2, 3, 5, 7, 10];

/**
 * 月間カレンダー問題の生成
 */
export function generateCalendarProblem(
  params: M11Params,
  ctx: GenerateContext
): CalendarProblem {
  let year = params.year;
  let month = params.month;
  let daysInMonth = 30;
  let firstDayOfWeek: Weekday = 0;

  if (params.calendarSource === 'actual') {
    daysInMonth = getDaysInMonth(year, month);
    firstDayOfWeek = getFirstDayOfWeek(year, month);
  } else {
    // 練習用: 月 1..12、日数は実日数（2月は28固定）、初日曜日は乱数
    month = ctx.rng.int(1, 12);
    year = 2027; // 2027年（平年）の月日数を使用
    daysInMonth = month === 2 ? 28 : getDaysInMonth(year, month);
    firstDayOfWeek = ctx.rng.int(0, 6) as Weekday;
  }

  const getDayOfWeek = (day: number): Weekday => {
    return ((firstDayOfWeek + (day - 1)) % 7) as Weekday;
  };

  // 曜日ごとの日付リストを作成
  const daysByWeekday: Record<Weekday, number[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (let d = 1; d <= daysInMonth; d++) {
    daysByWeekday[getDayOfWeek(d)].push(d);
  }

  // 予定イベントの選定
  const conditionCount = Math.max(3, Math.min(6, params.conditionCount));
  const chosenTemplates = ctx.draw(
    'calendarEvents',
    CALENDAR_EVENT_TEMPLATES,
    conditionCount
  );

  // 各日のイベント登録追跡（最大2件/日）
  const dayEventsMap = new Map<number, CalendarEventEntry[]>();
  for (let d = 1; d <= daysInMonth; d++) {
    dayEventsMap.set(d, []);
  }

  let weeklyCount = 0;
  const conditions: CalendarCondition[] = [];

  for (let i = 0; i < chosenTemplates.length; i++) {
    const tmpl = chosenTemplates[i];
    if (!tmpl) continue;

    const allowedKinds = tmpl.kinds.filter((k) => {
      if (k === 'weekly') return weeklyCount < 2;
      return true;
    });

    const kind = (allowedKinds.length > 0
      ? ctx.rng.pick(allowedKinds)
      : 'specificDate') as CalendarRuleKind;

    const availableWeekdays: readonly Weekday[] =
      tmpl.weekdays && tmpl.weekdays.length > 0
        ? tmpl.weekdays
        : [1, 2, 3, 4, 5]; // 規定は平日

    let assignedDays: number[] = [];
    let conditionText = '';

    if (kind === 'weekly') {
      // 毎週〇曜日
      // 重複2件以下になる曜日を探す
      const shuffledWd = ctx.rng.shuffle([...availableWeekdays]);
      let selectedWd: Weekday | undefined;

      for (const wd of shuffledWd) {
        const days = daysByWeekday[wd];
        const canFit = days.every((d) => (dayEventsMap.get(d)?.length ?? 0) < 2);
        if (canFit) {
          selectedWd = wd;
          break;
        }
      }

      if (selectedWd !== undefined) {
        weeklyCount++;
        assignedDays = [...daysByWeekday[selectedWd]];
        conditionText = `毎週${WEEKDAY_LABELS[selectedWd]}曜日は${tmpl.label}`;
      } else {
        // weekly が入らなければ特定日へフォールバック
        assignedDays = findFreeDay(dayEventsMap, daysInMonth, ctx);
        conditionText = `${assignedDays[0] ?? 1}日は${tmpl.label}`;
      }
    } else if (kind === 'nthWeekday') {
      // 第N〇曜日 (N=1..4)
      const shuffledWd = ctx.rng.shuffle([...availableWeekdays]);
      let found = false;

      for (const wd of shuffledWd) {
        const days = daysByWeekday[wd];
        const availableNs = [1, 2, 3, 4].filter((n) => days.length >= n);
        ctx.rng.shuffle(availableNs);

        for (const n of availableNs) {
          const targetDay = days[n - 1];
          if (targetDay !== undefined && (dayEventsMap.get(targetDay)?.length ?? 0) < 2) {
            assignedDays = [targetDay];
            conditionText = `第${n}${WEEKDAY_LABELS[wd]}曜日は${tmpl.label}`;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        assignedDays = findFreeDay(dayEventsMap, daysInMonth, ctx);
        conditionText = `${assignedDays[0] ?? 1}日は${tmpl.label}`;
      }
    } else if (kind === 'lastWeekday') {
      // 最終〇曜日
      const shuffledWd = ctx.rng.shuffle([...availableWeekdays]);
      let found = false;

      for (const wd of shuffledWd) {
        const days = daysByWeekday[wd];
        if (days.length === 0) continue;
        const targetDay = days[days.length - 1];
        if (targetDay !== undefined && (dayEventsMap.get(targetDay)?.length ?? 0) < 2) {
          assignedDays = [targetDay];
          conditionText = `最後の${WEEKDAY_LABELS[wd]}曜日は${tmpl.label}`;
          found = true;
          break;
        }
      }

      if (!found) {
        assignedDays = findFreeDay(dayEventsMap, daysInMonth, ctx);
        conditionText = `${assignedDays[0] ?? 1}日は${tmpl.label}`;
      }
    } else if (kind === 'relativeDays') {
      // 基準日のK日前またはK日後
      const k = ctx.rng.pick(RELATIVE_K_CANDIDATES);
      const isAfter = ctx.rng.chance(0.5);

      // 条件を満たす基準日候補を探索
      const candidateBases: { base: number; target: number }[] = [];
      for (let base = 1; base <= daysInMonth; base++) {
        const target = isAfter ? base + k : base - k;
        if (target >= 1 && target <= daysInMonth) {
          if ((dayEventsMap.get(target)?.length ?? 0) < 2) {
            candidateBases.push({ base, target });
          }
        }
      }

      if (candidateBases.length > 0) {
        const pair = ctx.rng.pick(candidateBases);
        assignedDays = [pair.target];
        const dirText = isAfter ? `${k}日後` : `${k}日前`;
        conditionText = `${pair.base}日の${dirText}は${tmpl.label}`;
      } else {
        assignedDays = findFreeDay(dayEventsMap, daysInMonth, ctx);
        conditionText = `${assignedDays[0] ?? 1}日は${tmpl.label}`;
      }
    } else {
      // specificDate
      assignedDays = findFreeDay(dayEventsMap, daysInMonth, ctx);
      conditionText = `${month}月${assignedDays[0] ?? 1}日は${tmpl.label}`;
    }

    // 予定をマップに登録
    for (const d of assignedDays) {
      dayEventsMap.get(d)?.push({
        templateId: tmpl.id,
        label: tmpl.label,
        shortLabel: tmpl.shortLabel,
      });
    }

    conditions.push({
      id: `c-${i + 1}`,
      text: conditionText,
      templateId: tmpl.id,
      ruleKind: kind,
      targetDays: assignedDays,
    });
  }

  // カレンダーグリッドの作成
  const startCol =
    params.weekStart === 'mon'
      ? (firstDayOfWeek + 6) % 7 // 月曜始まりの場合: 月=0..日=6
      : firstDayOfWeek; // 日曜始まりの場合: 日=0..土=6

  const rows: CalendarCell[][] = [];
  let currentRow: CalendarCell[] = [];

  // 1日前のパディング
  for (let c = 0; c < startCol; c++) {
    const padWd =
      params.weekStart === 'mon'
        ? (((c + 1) % 7) as Weekday)
        : (c as Weekday);
    currentRow.push({ day: 0, weekday: padWd, events: [] });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const wd = getDayOfWeek(d);
    currentRow.push({
      day: d,
      weekday: wd,
      events: dayEventsMap.get(d) ?? [],
    });

    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  // 最終週のパディング
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      const c = currentRow.length;
      const padWd =
        params.weekStart === 'mon'
          ? (((c + 1) % 7) as Weekday)
          : (c as Weekday);
      currentRow.push({ day: 0, weekday: padWd, events: [] });
    }
    rows.push(currentRow);
  }

  // 質問の生成（question または both の場合）
  const questions: CalendarQuestion[] = [];
  if (params.calendarTask === 'question' || params.calendarTask === 'both') {
    const singleDayConditions = conditions.filter((c) => c.targetDays.length === 1);
    const weeklyConditions = conditions.filter((c) => c.targetDays.length > 1);

    if (singleDayConditions.length > 0) {
      const c1 = singleDayConditions[0]!;
      const targetDay = c1.targetDays[0]!;
      const tmpl = chosenTemplates.find((t) => t.id === c1.templateId);
      if (tmpl) {
        questions.push({
          id: 'q-1',
          questionText: `「${tmpl.label}」は何日ですか？`,
          answerText: `${targetDay}日（${WEEKDAY_LABELS[getDayOfWeek(targetDay)]}曜日）`,
        });
      }
    }

    if (weeklyConditions.length > 0) {
      const c2 = weeklyConditions[0]!;
      const tmpl = chosenTemplates.find((t) => t.id === c2.templateId);
      if (tmpl) {
        questions.push({
          id: 'q-2',
          questionText: `今月、「${tmpl.label}」は全部で何回ありますか？`,
          answerText: `${c2.targetDays.length}回`,
        });
      }
    } else if (singleDayConditions.length > 1) {
      const c2 = singleDayConditions[1]!;
      const targetDay = c2.targetDays[0]!;
      const tmpl = chosenTemplates.find((t) => t.id === c2.templateId);
      if (tmpl) {
        questions.push({
          id: 'q-2',
          questionText: `「${tmpl.label}」は何曜日ですか？`,
          answerText: `${WEEKDAY_LABELS[getDayOfWeek(targetDay)]}曜日（${targetDay}日）`,
        });
      }
    }

    // 質問3: 特定の日の予定を尋ねる
    const daysWithEvents = Array.from(dayEventsMap.entries()).filter(
      ([, evts]) => evts.length > 0
    );
    if (daysWithEvents.length > 0) {
      const [askDay, evts] = ctx.rng.pick(daysWithEvents);
      const labels = evts.map((e) => e.label).join('、');
      questions.push({
        id: 'q-3',
        questionText: `${askDay}日の予定は何ですか？`,
        answerText: labels,
      });
    }
  }

  return {
    year,
    month,
    daysInMonth,
    weekStart: params.weekStart,
    firstDayOfWeek,
    rows,
    conditions,
    questions,
  };
}

/**
 * 2件未満の空きがある日を探索する
 */
function findFreeDay(
  map: Map<number, CalendarEventEntry[]>,
  daysInMonth: number,
  ctx: GenerateContext
): [number] {
  const freeDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if ((map.get(d)?.length ?? 0) < 2) {
      freeDays.push(d);
    }
  }
  if (freeDays.length === 0) {
    return [ctx.rng.int(1, daysInMonth)];
  }
  return [ctx.rng.pick(freeDays)];
}
