/**
 * M12 服薬管理・残薬計算 描画処理
 * ARCHITECTURE.md §5.6, §8, §9 準拠
 */

import type {
  CommonParams,
  DoseTiming,
  GenerateContext,
  GenerateResult,
  M12Params,
} from '../../../types/schema';
import { DOSE_TIMING_LABELS } from '../../../types/schema';
import { esc } from '../../../utils/html';
import {
  formatTimingLabels,
  generateMedicationProblem,
  type MedicationProblem,
} from './logic';

/**
 * M12 HTML 描画
 */
export function renderM12(
  ctx: GenerateContext,
  params: M12Params & CommonParams
): GenerateResult {
  const problem = generateMedicationProblem(params, ctx);
  const taskHtml = renderMedicationTask(problem, params, params);
  const answerHtml = renderMedicationAnswer(problem, params, params);

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

function renderMedicationTask(
  prob: MedicationProblem,
  _params: M12Params,
  common: CommonParams
): string {
  const tScale = common.textScale / 100;
  const baseFs = Math.max(8.5, Math.min(12, 9.5 * tScale));

  const instructionHtml = buildExplanationTable(prob, false);
  const organizerHtml =
    prob.organizer === 'daily'
      ? buildDailyOrganizer(prob, false)
      : buildWeeklyOrganizer(prob, false);
  const calcHtml = prob.includeCalc ? buildCalculationSection(prob, false) : '';

  return `
<div class="m12-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; gap: 8px;">
  <div style="font-weight: bold; font-size: ${baseFs * 1.1}pt;">【服薬管理・残薬計算課題】</div>
  <div style="font-size: ${baseFs * 0.9}pt; color: #333; line-height: 1.3;">
    下のお薬説明書をよく読んで、配薬カレンダーの仕分けと必要数の計算を行いましょう。
  </div>

  <!-- 上段: お薬説明書 -->
  <div style="flex-shrink: 0;">
    ${instructionHtml}
  </div>

  <!-- 中段: 配薬仕分け表 -->
  <div style="flex-shrink: 0;">
    <div style="font-weight: bold; margin-bottom: 3px; font-size: ${baseFs * 0.95}pt;">【設問1：お薬の仕分け（配薬表）】</div>
    <div style="font-size: 8pt; color: #555; margin-bottom: 4px;">各タイミングで飲むお薬と錠数を書き込みましょう（飲まない区分は「なし」）。</div>
    ${organizerHtml}
  </div>

  <!-- 下段: 必要数・残薬計算 -->
  ${calcHtml ? `<div style="flex: 1; min-height: 0;">${calcHtml}</div>` : ''}
</div>
  `.trim();
}

function renderMedicationAnswer(
  prob: MedicationProblem,
  _params: M12Params,
  common: CommonParams
): string {
  const tScale = common.textScale / 100;
  const baseFs = Math.max(8.5, Math.min(12, 9.5 * tScale));

  const instructionHtml = buildExplanationTable(prob, true);
  const organizerHtml =
    prob.organizer === 'daily'
      ? buildDailyOrganizer(prob, true)
      : buildWeeklyOrganizer(prob, true);
  const calcHtml = prob.includeCalc ? buildCalculationSection(prob, true) : '';

  return `
<div class="m12-container" style="font-size: ${baseFs}pt; display: flex; flex-direction: column; width: 100%; height: 100%; box-sizing: border-box; gap: 8px;">
  <div style="font-weight: bold; font-size: ${baseFs * 1.1}pt;">【服薬管理・残薬計算課題（模範解答）】</div>

  <!-- 上段: お薬説明書 -->
  <div style="flex-shrink: 0;">
    ${instructionHtml}
  </div>

  <!-- 中段: 配薬仕分け表 -->
  <div style="flex-shrink: 0;">
    <div style="font-weight: bold; margin-bottom: 3px; font-size: ${baseFs * 0.95}pt;">【設問1：お薬の仕分け（解答）】</div>
    ${organizerHtml}
  </div>

  <!-- 下段: 必要数・残薬計算 -->
  ${calcHtml ? `<div style="flex: 1; min-height: 0;">${calcHtml}</div>` : ''}
</div>
  `.trim();
}

// =============================================================================
// お薬説明書テーブル
// =============================================================================

function buildExplanationTable(prob: MedicationProblem, _isAnswer: boolean): string {
  const rows = prob.drugs
    .map((d) => {
      const timingText = formatTimingLabels(d.timings);
      return `
<tr>
  <td style="border: 1px solid #444; padding: 3px 6px; font-weight: bold;">${esc(d.displayName)}</td>
  <td style="border: 1px solid #444; padding: 3px 6px; text-align: center;">${esc(d.effect)}</td>
  <td style="border: 1px solid #444; padding: 3px 6px; text-align: center; color: #003399;">${esc(timingText)}</td>
  <td style="border: 1px solid #444; padding: 3px 6px; text-align: center;">1回 ${d.dosePerTime}${esc(d.form)}</td>
</tr>
      `.trim();
    })
    .join('');

  return `
<div style="border: 1px solid #444; border-radius: 4px; overflow: hidden; background: #fff;">
  <div style="background: #eef2f8; padding: 4px 8px; font-weight: bold; font-size: 9pt; border-bottom: 1px solid #444;">
    【お薬説明書】
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
    <thead>
      <tr style="background: #f7f9fa;">
        <th style="border: 1px solid #444; padding: 3px 6px; text-align: left; width: 34%;">お薬名</th>
        <th style="border: 1px solid #444; padding: 3px 6px; width: 26%;">主な効能</th>
        <th style="border: 1px solid #444; padding: 3px 6px; width: 24%;">飲むタイミング</th>
        <th style="border: 1px solid #444; padding: 3px 6px; width: 16%;">1回の量</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
  `.trim();
}

// =============================================================================
// 1日4区分配薬表（daily）
// =============================================================================

function buildDailyOrganizer(prob: MedicationProblem, isAnswer: boolean): string {
  const timings: DoseTiming[] = ['morning', 'noon', 'evening', 'bedtime'];

  const cells = timings
    .map((t) => {
      const label = DOSE_TIMING_LABELS[t];
      const items = prob.timingSchedule[t] ?? [];

      let contentHtml = '&nbsp;';
      if (isAnswer) {
        if (items.length === 0) {
          contentHtml = `<div style="color: #888; font-style: italic; text-align: center; padding-top: 12px;">なし</div>`;
        } else {
          contentHtml = items
            .map(
              (it) =>
                `<div style="color: #900; font-weight: bold; margin-bottom: 2px;">・${esc(it.drug.displayName)}：${it.dose}${esc(it.drug.form)}</div>`
            )
            .join('');
        }
      }

      return `
<div style="flex: 1; border: 1px solid #444; border-radius: 3px; display: flex; flex-direction: column; min-height: 24mm; background: #fff;">
  <div style="background: #f0f0f0; border-bottom: 1px solid #444; text-align: center; font-weight: bold; padding: 3px; font-size: 9pt;">
    ${esc(label)}
  </div>
  <div style="padding: 4px; font-size: 8pt; flex: 1;">
    ${contentHtml}
  </div>
</div>
      `.trim();
    })
    .join('');

  return `<div style="display: flex; gap: 8px; width: 100%;">${cells}</div>`;
}

// =============================================================================
// 1週間カレンダー配薬表（weekly）
// =============================================================================

function buildWeeklyOrganizer(prob: MedicationProblem, isAnswer: boolean): string {
  const days = ['月', '火', '水', '木', '金', '土', '日'];
  const timings: DoseTiming[] = ['morning', 'noon', 'evening', 'bedtime'];

  const headerCells = days
    .map((d) => `<th style="border: 1px solid #444; padding: 2px; text-align: center; background: #f0f0f0; font-size: 8pt;">${d}</th>`)
    .join('');

  const rows = timings
    .map((t) => {
      const label = DOSE_TIMING_LABELS[t];
      const items = prob.timingSchedule[t] ?? [];

      let itemText = '&nbsp;';
      if (isAnswer) {
        if (items.length === 0) {
          itemText = `<span style="color: #888; font-size: 7.5pt;">なし</span>`;
        } else {
          itemText = items
            .map((it) => `<div style="color: #900; font-size: 7.5pt; font-weight: bold;">${esc(it.drug.letter)}${esc(it.drug.form)} ${it.dose}</div>`)
            .join('');
        }
      }

      const dayCols = days
        .map(() => `<td style="border: 1px solid #444; padding: 2px; vertical-align: top; height: 11mm;">${itemText}</td>`)
        .join('');

      return `
<tr>
  <td style="border: 1px solid #444; background: #fafafa; font-weight: bold; text-align: center; width: 50px; font-size: 8pt;">${esc(label)}</td>
  ${dayCols}
</tr>
      `.trim();
    })
    .join('');

  return `
<div style="border: 1px solid #444; border-radius: 3px; overflow: hidden; background: #fff;">
  <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
    <thead>
      <tr>
        <th style="border: 1px solid #444; width: 50px; background: #e8e8e8; font-size: 8pt;">区分</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>
  `.trim();
}

// =============================================================================
// 必要数・残薬計算セクション
// =============================================================================

function buildCalculationSection(prob: MedicationProblem, isAnswer: boolean): string {
  // 旅行日数分の必要総数テーブル
  const tableRows = prob.drugs
    .map((d) => {
      const ansText = isAnswer
        ? `<span style="color: #900; font-weight: bold;">${d.requiredTotal}${esc(d.form)}</span>`
        : `<span style="display: inline-block; width: 50px; border-bottom: 1px solid #333;">&nbsp;</span>`;

      return `
<tr>
  <td style="border: 1px solid #666; padding: 2px 4px;">${esc(d.displayName)}</td>
  <td style="border: 1px solid #666; text-align: center; padding: 2px 4px;">${d.dailyTotal}${esc(d.form)}</td>
  <td style="border: 1px solid #666; text-align: center; padding: 2px 4px;">${prob.travelDays}日分</td>
  <td style="border: 1px solid #666; text-align: center; padding: 2px 4px;">${ansText}</td>
</tr>
      `.trim();
    })
    .join('');

  const tableHtml = `
<table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 3px;">
  <thead>
    <tr style="background: #f0f0f0;">
      <th style="border: 1px solid #666; text-align: left; padding: 2px 4px;">お薬名</th>
      <th style="border: 1px solid #666; width: 20%; padding: 2px 4px;">1日の服用数</th>
      <th style="border: 1px solid #666; width: 20%; padding: 2px 4px;">旅行日数</th>
      <th style="border: 1px solid #666; width: 24%; padding: 2px 4px;">旅行に必要な総数</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>
  `.trim();

  // 残薬・不足数設問
  let stockQuestionsHtml = '';
  if (prob.includeStock && prob.stockQuestions.length > 0) {
    const qItems = prob.stockQuestions
      .map((q, idx) => {
        const ansBox = isAnswer
          ? `<span style="color: #900; font-weight: bold;">${esc(q.answerText)}</span>`
          : `<span style="display: inline-block; width: 120px; border-bottom: 1px solid #333;">&nbsp;</span>`;

        return `
<div style="margin-top: 4px; font-size: 8.5pt; line-height: 1.3;">
  <div>問${idx + 1}. ${esc(q.questionText)}</div>
  <div style="margin-top: 1px; padding-left: 12px;">答え：${ansBox}</div>
</div>
        `.trim();
      })
      .join('');

    stockQuestionsHtml = `
<div style="margin-top: 6px; border-top: 1px dashed #ccc; padding-top: 4px;">
  <div style="font-weight: bold; font-size: 8.5pt;">【残薬・過不足の確認】</div>
  ${qItems}
</div>
    `.trim();
  }

  return `
<div style="border: 1px solid #666; border-radius: 4px; padding: 6px; background: #fff;">
  <div style="font-weight: bold; font-size: 9pt;">【設問2：必要数・残薬の確認（旅行${prob.travelDays}日分）】</div>
  ${tableHtml}
  ${stockQuestionsHtml}
</div>
  `.trim();
}
