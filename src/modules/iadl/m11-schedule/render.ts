/**
 * M11 スケジュール・カレンダー 描画処理
 * ARCHITECTURE.md §5.3, §5.6, §8, §9 準拠
 */

import { checklistTableHtml } from '../../../print/answerParts';
import type {
  ChecklistItem,
  CommonParams,
  GenerateContext,
  GenerateResult,
  M11Params,
} from '../../../types/schema';
import { WEEKDAY_LABELS } from '../../../types/schema';
import { esc } from '../../../utils/html';
import {
  generateCalendarProblem,
  type CalendarProblem,
} from './calendar';
import { formatMinute } from './solver';
import {
  generateTimetableProblem,
} from './timetable';

/**
 * M11 HTML 描画
 */
export function renderM11(
  ctx: GenerateContext,
  params: M11Params & CommonParams
): GenerateResult {
  if (params.subMode === 'calendar') {
    const problem = generateCalendarProblem(params, ctx);
    const taskHtml = renderCalendarTask(problem, params, params);
    const answerHtml = renderCalendarAnswer(problem, params, params);
    return {
      pages: [
        {
          pageRole: 'problem',
          kind: 'html',
          markup: taskHtml,
        },
        {
          pageRole: 'answer',
          kind: 'html',
          markup: answerHtml,
        },
      ],
    };
  } else {
    const problem = generateTimetableProblem(params, ctx);
    const taskHtml = renderTimetableTask(problem, params, params);
    const answerHtml = renderTimetableAnswer(problem, params, params);
    return {
      pages: [
        {
          pageRole: 'problem',
          kind: 'html',
          markup: taskHtml,
        },
        {
          pageRole: 'answer',
          kind: 'html',
          markup: answerHtml,
        },
      ],
    };
  }
}

// =============================================================================
// カレンダー描画（M11A）
// =============================================================================

function renderCalendarTask(
  prob: CalendarProblem,
  params: M11Params,
  common: CommonParams
): string {
  const isQuestionOnly = params.calendarTask === 'question';
  const showEventsOnSheet = isQuestionOnly; // question のときは最初から予定が書かれている

  const tScale = common.textScale / 100;
  const baseFs = Math.max(9, Math.min(13, 10.5 * tScale));

  const tableHtml = buildCalendarTable(prob, showEventsOnSheet, false);
  const condHtml = buildCalendarConditionsHtml(prob, params);
  const questHtml = buildCalendarQuestionsHtml(prob, params, false);

  let instruction = '以下の条件に従って、カレンダーに予定の略記を書き込みましょう。';
  if (params.calendarTask === 'question') {
    instruction = 'カレンダーの予定を見て、下の質問に答えましょう。';
  } else if (params.calendarTask === 'both') {
    instruction = '条件に従ってカレンダーに予定を書き込み、下の質問にも答えましょう。';
  }

  return `
<div class="m11-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%; box-sizing: border-box;">
  <div style="font-weight: bold; margin-bottom: 2px;">【${prob.year}年 ${prob.month}月 カレンダー】</div>
  <div style="margin-bottom: 4px; font-size: ${baseFs * 0.95}pt; color: #333;">${esc(instruction)}</div>
  <div style="flex-shrink: 0;">
    ${tableHtml}
  </div>
  <div style="display: flex; gap: 16px; margin-top: 4px; flex: 1; min-height: 0;">
    ${params.calendarTask !== 'question' ? `<div style="flex: 1; min-width: 0;">${condHtml}</div>` : ''}
    ${params.calendarTask !== 'write' ? `<div style="flex: 1; min-width: 0;">${questHtml}</div>` : ''}
  </div>
</div>
  `.trim();
}

function renderCalendarAnswer(
  prob: CalendarProblem,
  params: M11Params,
  common: CommonParams
): string {
  const tScale = common.textScale / 100;
  const baseFs = Math.max(9, Math.min(13, 10.5 * tScale));

  const tableHtml = buildCalendarTable(prob, true, true);
  const condHtml = buildCalendarConditionsHtml(prob, params);
  const questHtml = buildCalendarQuestionsHtml(prob, params, true);

  return `
<div class="m11-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%; box-sizing: border-box;">
  <div style="font-weight: bold; margin-bottom: 2px;">【${prob.year}年 ${prob.month}月 カレンダー（模範解答）】</div>
  <div style="flex-shrink: 0;">
    ${tableHtml}
  </div>
  <div style="display: flex; gap: 16px; margin-top: 4px; flex: 1; min-height: 0;">
    ${params.calendarTask !== 'question' ? `<div style="flex: 1; min-width: 0;">${condHtml}</div>` : ''}
    ${params.calendarTask !== 'write' ? `<div style="flex: 1; min-width: 0;">${questHtml}</div>` : ''}
  </div>
</div>
  `.trim();
}

function buildCalendarTable(
  prob: CalendarProblem,
  showEvents: boolean,
  isAnswer: boolean
): string {
  const weekdays =
    prob.weekStart === 'mon'
      ? ([1, 2, 3, 4, 5, 6, 0] as const)
      : ([0, 1, 2, 3, 4, 5, 6] as const);

  // 6週ある月（例: 2031年11月）でも下部の条件・質問欄を圧迫しないようセル高を調整
  const cellHeightMm = prob.rows.length >= 6 ? 12.5 : 14.5;

  const headerCells = weekdays
    .map((wd) => {
      let color = '#222';
      if (wd === 0) color = '#c00'; // 日曜
      if (wd === 6) color = '#0066cc'; // 土曜
      return `<th style="border: 1px solid #333; background: #ebebeb; color: ${color}; text-align: center; padding: 3px 0; font-size: 10pt; width: 14.28%;">${WEEKDAY_LABELS[wd]}</th>`;
    })
    .join('');

  const rowHtmls = prob.rows.map((row) => {
    const cells = row
      .map((cell) => {
        if (cell.day === 0) {
          // 隣接する日付セルの上辺・左辺や表外枠の線が border-collapse で薄くならないよう、枠線色は #333 に統一する
          return `<td style="border: 1px solid #333; background: #f3f3f3; height: ${cellHeightMm}mm;"></td>`;
        }
        let dayColor = '#222';
        if (cell.weekday === 0) dayColor = '#c00';
        if (cell.weekday === 6) dayColor = '#0066cc';

        let eventsHtml = '';
        if (showEvents && cell.events.length > 0) {
          eventsHtml = cell.events
            .map((e) => {
              const text = esc(e.shortLabel);
              const style = isAnswer
                ? 'background: #fff0f0; border: 1px solid #c00; color: #900; font-weight: bold; border-radius: 2px;'
                : 'background: #eef; border: 1px solid #88c; color: #113; border-radius: 2px;';
              return `<div style="${style} padding: 1px 2px; margin-top: 1px; font-size: 8.5pt; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${text}</div>`;
            })
            .join('');
        }

        return `
<td style="border: 1px solid #333; background: #fff; height: ${cellHeightMm}mm; vertical-align: top; padding: 2px 3px; text-align: left; box-sizing: border-box;">
  <div style="font-weight: bold; font-size: 9pt; color: ${dayColor}; line-height: 1.1; text-align: center;">${cell.day}</div>
  <div style="margin-top: 1px; display: flex; flex-direction: column; gap: 1px;">
    ${eventsHtml}
  </div>
</td>
        `.trim();
      })
      .join('');

    return `<tr>${cells}</tr>`;
  }).join('');

  return `
<table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #222;">
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${rowHtmls}</tbody>
</table>
  `.trim();
}

function buildCalendarConditionsHtml(
  prob: CalendarProblem,
  _params: M11Params
): string {
  const items = prob.conditions
    .map(
      (c, idx) =>
        `<li style="margin-bottom: 3px; line-height: 1.35;">${idx + 1}. ${esc(c.text)}</li>`
    )
    .join('');

  return `
<div style="border: 1px solid #666; border-radius: 4px; padding: 6px 10px; background: #fff;">
  <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px;">【予定の条件】</div>
  <ol style="margin: 0; padding-left: 2px; list-style: none; font-size: 9.5pt;">
    ${items}
  </ol>
</div>
  `.trim();
}

function buildCalendarQuestionsHtml(
  prob: CalendarProblem,
  _params: M11Params,
  isAnswer: boolean
): string {
  if (prob.questions.length === 0) return '';

  const items = prob.questions
    .map((q, idx) => {
      const qText = `${idx + 1}. ${esc(q.questionText)}`;
      const ansBox = isAnswer
        ? `<span style="color: #c00; font-weight: bold; padding: 0 4px;">${esc(q.answerText)}</span>`
        : `<span style="display: inline-block; width: 100px; border-bottom: 1px solid #333; margin-left: 6px;">&nbsp;</span>`;

      return `
<div style="margin-bottom: 6px; line-height: 1.3;">
  <div>${qText}</div>
  <div style="margin-top: 2px; padding-left: 14px; font-size: 9.5pt;">答え：${ansBox}</div>
</div>
      `.trim();
    })
    .join('');

  return `
<div style="border: 1px solid #666; border-radius: 4px; padding: 6px 10px; background: #fff;">
  <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px;">【質問】</div>
  <div style="font-size: 9.5pt;">
    ${items}
  </div>
</div>
  `.trim();
}

// =============================================================================
// タイムスケジュール描画（M11B）
// =============================================================================

function renderTimetableTask(
  prob: ReturnType<typeof generateTimetableProblem>,
  params: M11Params,
  common: CommonParams
): string {
  const tScale = common.textScale / 100;
  const baseFs = Math.max(8.5, Math.min(12, 10 * tScale));

  const errandsHtml = buildErrandsListHtml(prob);
  const condHtml = buildTimetableConditionsHtml(prob);
  const gridHtml = buildBlankTimetableGrid(prob);

  return `
<div class="m11-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; gap: 8px;">
  <div style="font-weight: bold; font-size: ${baseFs * 1.1}pt;">【1日タイムスケジュール立案】</div>
  <div style="font-size: ${baseFs * 0.9}pt; color: #333; line-height: 1.3;">
    下の用事一覧と条件を確認し、${formatMinute(prob.dayStart)}から${formatMinute(prob.dayEnd)}までの予定表を組み立てましょう。
    ${params.includeTravel ? '※自宅から出発し、場所が変わる用事の間には移動時間（30分）を確保してください。' : ''}
  </div>

  <div style="display: flex; gap: 14px; flex: 1; min-height: 0;">
    <!-- 左列: 用事一覧・条件 -->
    <div style="flex: 1.1; display: flex; flex-direction: column; gap: 8px; min-width: 0;">
      ${errandsHtml}
      ${condHtml}
    </div>

    <!-- 右列: 空白タイムテーブル -->
    <div style="flex: 0.9; min-width: 0; display: flex; flex-direction: column;">
      ${gridHtml}
    </div>
  </div>
</div>
  `.trim();
}

function renderTimetableAnswer(
  prob: ReturnType<typeof generateTimetableProblem>,
  params: M11Params,
  common: CommonParams
): string {
  const tScale = common.textScale / 100;
  const baseFs = Math.max(8.5, Math.min(12, 10 * tScale));

  const answerGridHtml = buildSolvedTimetableGrid(prob);

  // チェックリストの作成
  const checklistItems: ChecklistItem[] = [
    { id: 'chk-all', label: 'すべての用事が1回ずつ入っている', expected: '〇', points: 20 },
    { id: 'chk-time', label: `${formatMinute(prob.dayStart)}〜${formatMinute(prob.dayEnd)}の時間内に収まっている`, expected: '〇', points: 20 },
    { id: 'chk-overlap', label: '用事同士の時間が重複していない', expected: '〇', points: 20 },
  ];
  if (params.includeTravel) {
    checklistItems.push({ id: 'chk-travel', label: '異なる場所への移動時間（30分）がある', expected: '〇', points: 20 });
  }
  for (const c of prob.constraints) {
    checklistItems.push({ id: `chk-${c.id}`, label: c.label, expected: '条件充足', points: 10 });
  }

  const checklistHtml = checklistTableHtml(checklistItems);

  return `
<div class="m11-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; gap: 6px;">
  <div style="font-weight: bold; font-size: ${baseFs * 1.1}pt;">【1日タイムスケジュール立案（解答例）】</div>
  <div style="font-size: ${baseFs * 0.85}pt; color: #555;">
    ※すべての条件を満たしていれば、以下の解答例と異なる組み方でも正解です。
  </div>

  <div style="display: flex; gap: 14px; flex: 1; min-height: 0;">
    <!-- 左列: 完成タイムテーブル -->
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: bold; margin-bottom: 4px; font-size: ${baseFs * 0.95}pt;">【完成スケジュール例】</div>
      ${answerGridHtml}
    </div>

    <!-- 右列: 採点チェックリスト -->
    <div style="flex: 1.2; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
      <div style="font-weight: bold; font-size: ${baseFs * 0.95}pt;">【採点チェックリスト】</div>
      <div style="font-size: 8pt; line-height: 1.2;">
        ${checklistHtml}
      </div>
    </div>
  </div>
</div>
  `.trim();
}

function buildErrandsListHtml(
  prob: ReturnType<typeof generateTimetableProblem>
): string {
  const rows = prob.errands
    .map((e) => {
      return `
<tr>
  <td style="border: 1px solid #666; padding: 3px 6px; font-weight: bold;">${esc(e.label)}</td>
  <td style="border: 1px solid #666; padding: 3px 6px; text-align: center;">${esc(e.place)}</td>
  <td style="border: 1px solid #666; padding: 3px 6px; text-align: center;">${e.duration}分</td>
</tr>
      `.trim();
    })
    .join('');

  return `
<div style="border: 1px solid #666; border-radius: 4px; padding: 6px; background: #fff;">
  <div style="font-weight: bold; margin-bottom: 4px; font-size: 9.5pt;">【予定する用事】</div>
  <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #666; padding: 3px 6px; text-align: left;">用事</th>
        <th style="border: 1px solid #666; padding: 3px 6px; width: 30%;">場所</th>
        <th style="border: 1px solid #666; padding: 3px 6px; width: 22%;">所要時間</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
  `.trim();
}

function buildTimetableConditionsHtml(
  prob: ReturnType<typeof generateTimetableProblem>
): string {
  const items = prob.constraints
    .map(
      (c, idx) =>
        `<li style="margin-bottom: 4px; line-height: 1.3;">${idx + 1}. ${esc(c.label)}</li>`
    )
    .join('');

  return `
<div style="border: 1px solid #666; border-radius: 4px; padding: 6px 8px; background: #fff; flex: 1; min-height: 0; overflow: hidden;">
  <div style="font-weight: bold; margin-bottom: 4px; font-size: 9.5pt;">【スケジュール条件】</div>
  <ol style="margin: 0; padding-left: 2px; list-style: none; font-size: 8.5pt;">
    ${items}
  </ol>
</div>
  `.trim();
}

function buildBlankTimetableGrid(
  prob: ReturnType<typeof generateTimetableProblem>
): string {
  const totalSlots = (prob.dayEnd - prob.dayStart) / prob.slot;
  const rows: string[] = [];

  for (let s = 0; s < totalSlots; s++) {
    const curMin = prob.dayStart + s * prob.slot;
    const timeStr = formatMinute(curMin);
    const isHour = curMin % 60 === 0;
    const borderTop = isHour ? '1px solid #444' : '1px dashed #aaa';

    rows.push(`
<tr style="height: 6mm;">
  <td style="border-top: ${borderTop}; border-left: none; border-right: 1px solid #444; border-bottom: 1px solid #eee; width: 45px; text-align: right; padding: 0 6px 0 2px; font-size: 8pt; color: ${isHour ? '#000' : '#666'}; font-weight: ${isHour ? 'bold' : 'normal'}; background: #fafafa;">${timeStr}</td>
  <td style="border-top: ${borderTop}; border-left: 1px solid #444; border-right: none; border-bottom: 1px solid #eee; padding: 0 4px; text-align: left;">&nbsp;</td>
</tr>
    `.trim());
  }

  return `
<div style="border: 1px solid #444; border-radius: 3px; background: #fff; overflow: hidden;">
  <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
    <thead>
      <tr style="background: #e8e8e8; border-bottom: 1px solid #444;">
        <th style="border: none; border-right: 1px solid #444; border-bottom: 1px solid #444; width: 45px; padding: 3px 0; font-size: 8.5pt; text-align: center;">時刻</th>
        <th style="border: none; border-bottom: 1px solid #444; padding: 3px 0; font-size: 8.5pt; text-align: center;">予定（用事・移動など）</th>
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>
  </table>
</div>
  `.trim();
}

function buildSolvedTimetableGrid(
  prob: ReturnType<typeof generateTimetableProblem>
): string {
  const totalSlots = (prob.dayEnd - prob.dayStart) / prob.slot;
  const slotMap = new Map<number, { text: string; isTravel: boolean }>();

  // 移動時間と予定を slotMap にマッピング
  for (const item of prob.solution) {
    if (item.travelBefore > 0) {
      const travelStart = item.start - item.travelBefore;
      slotMap.set(travelStart, { text: '移動（30分）', isTravel: true });
    }
    const durationSlots = (item.end - item.start) / prob.slot;
    for (let i = 0; i < durationSlots; i++) {
      const t = item.start + i * prob.slot;
      const subLabel = durationSlots > 1 && i > 0 ? '（続き）' : '';
      slotMap.set(t, {
        text: `${item.label}（${item.place}）${subLabel}`,
        isTravel: false,
      });
    }
  }

  const rows: string[] = [];
  for (let s = 0; s < totalSlots; s++) {
    const curMin = prob.dayStart + s * prob.slot;
    const timeStr = formatMinute(curMin);
    const isHour = curMin % 60 === 0;
    const borderTop = isHour ? '1px solid #444' : '1px dashed #aaa';

    const entry = slotMap.get(curMin);
    let cellContent = '&nbsp;';
    let cellBg = '#fff';

    if (entry) {
      if (entry.isTravel) {
        cellBg = '#f5f5f5';
        cellContent = `<span style="color: #666; font-size: 8pt;">【移動】${esc(entry.text)}</span>`;
      } else {
        cellBg = '#eef6ff';
        cellContent = `<span style="color: #003399; font-weight: bold; font-size: 8pt;">${esc(entry.text)}</span>`;
      }
    }

    rows.push(`
<tr style="height: 6mm; background: ${cellBg};">
  <td style="border-top: ${borderTop}; border-left: none; border-right: 1px solid #444; border-bottom: 1px solid #eee; width: 45px; text-align: right; padding: 0 6px 0 2px; font-size: 8pt; color: ${isHour ? '#000' : '#666'}; font-weight: ${isHour ? 'bold' : 'normal'}; background: #fafafa;">${timeStr}</td>
  <td style="border-top: ${borderTop}; border-left: 1px solid #444; border-right: none; border-bottom: 1px solid #eee; padding: 0 4px; text-align: left;">${cellContent}</td>
</tr>
    `.trim());
  }

  return `
<div style="border: 1px solid #444; border-radius: 3px; background: #fff; overflow: hidden;">
  <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
    <thead>
      <tr style="background: #e8e8e8; border-bottom: 1px solid #444;">
        <th style="border: none; border-right: 1px solid #444; border-bottom: 1px solid #444; width: 45px; padding: 3px 0; font-size: 8.5pt; text-align: center;">時刻</th>
        <th style="border: none; border-bottom: 1px solid #444; padding: 3px 0; font-size: 8.5pt; text-align: center;">予定</th>
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>
  </table>
</div>
  `.trim();
}
