/**
 * M08 言語モジュール HTML 組版描画
 * ARCHITECTURE.md §6, §8, §9, §11.2 準拠
 */

import { checklistTableHtml } from '../../../print/answerParts';
import type {
  ChecklistItem,
  CommonParams,
  M08Params,
  PageBody,
} from '../../../types/schema';
import { TYPOGRAPHY } from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import type { AnagramData } from './anagram';
import type { CategoryData } from './category';
import { formatVocabWord, formatVocabWordPlain } from './common';
import type { FillData } from './fill';
import type { SentenceData } from './sentence';
import { buildSentenceChecklist } from './sentence';

export type M08GeneratedData =
  | { readonly subMode: 'fill'; readonly data: FillData }
  | { readonly subMode: 'anagram'; readonly data: AnagramData }
  | { readonly subMode: 'category'; readonly data: CategoryData }
  | { readonly subMode: 'sentence'; readonly data: SentenceData };

const COMMON_M08_STYLE = `
  <style>
    .m08-container {
      width: 100%;
    }
    .m08-container ruby {
      ruby-align: center;
    }
    .m08-container rt {
      font-size: 0.55em;
      line-height: 1;
    }
    .char-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      background: #FFF;
    }
    .m08-checklist-container .checklist-table {
      font-size: 2.4mm;
      line-height: 1.15;
    }
    .m08-checklist-container .checklist-table th,
    .m08-checklist-container .checklist-table td {
      padding: 0.25mm 0.8mm;
      white-space: nowrap;
    }
    .m08-checklist-container .checklist-table__expected {
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 66mm;
    }
  </style>
`;

/**
 * 設問数 N と役割（問題 / 解答）から1問あたりの縦スロット高（mm）を算出する
 */
function getRowSlotMm(itemCount: number, role: 'problem' | 'answer'): number {
  const n = Math.max(1, itemCount);
  const availTotalMm = role === 'answer' ? 182 : 228;
  return availTotalMm / n;
}

// -----------------------------------------------------------------------------
// 1. サブモード A: 単語穴埋め（fill）
// -----------------------------------------------------------------------------

function renderFillHtml(
  data: FillData,
  params: M08Params & CommonParams,
  role: 'problem' | 'answer',
): string {
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;
  const n = data.items.length;

  const rowSlotMm = getRowSlotMm(n, role);
  const marginBottomMm = Math.min(2.2, Math.max(0.7, rowSlotMm * 0.15));
  const maxContentMm = Math.max(5.5, rowSlotMm - marginBottomMm - 0.3);

  const desiredFontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const boxSizeMm = Math.max(
    5.4,
    Math.min(9.5, desiredFontMm * 1.95, maxContentMm),
  );
  const fontMm = Math.max(
    2.8,
    Math.min(desiredFontMm, boxSizeMm * 0.52, maxContentMm / 2.2),
  );
  const hintFontMm = Math.max(
    2.6,
    Math.min(fontMm * 0.92, n >= 14 ? 3.5 : 4.2, maxContentMm / 2.35),
  );
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  const itemsHtml = data.items
    .map((item) => {
      const qNum = `問${item.index}`;
      const hint = esc(item.hintText);

      const cellsHtml = item.cells
        .map((ch, cIdx) => {
          if (role === 'problem') {
            const displayChar = ch !== null ? esc(ch) : '';
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; font-size: ${fmt(boxSizeMm * 0.56)}mm;">${displayChar}</span>`;
          } else {
            // 解答用紙：全文字マスに正解の文字を表示（伏せ字だった箇所は赤太枠または太字黒で明示）
            const answerChar = Array.from(item.answerKana)[cIdx] ?? '';
            const isRevealed = ch !== null;
            const style = isRevealed
              ? `width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; font-size: ${fmt(boxSizeMm * 0.56)}mm;`
              : `width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(answerBorderMm)}mm solid #D00000; font-weight: bold; font-size: ${fmt(boxSizeMm * 0.6)}mm; color: #000;`;
            return `<span class="char-box" style="${style}">${esc(answerChar)}</span>`;
          }
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1; padding-right: 2.5mm; display: flex; align-items: baseline; min-width: 0;">
            <span style="font-weight: bold; white-space: nowrap; min-width: ${fmt(fontMm * 3.1)}mm; margin-right: 1.5mm; flex-shrink: 0;">${qNum}.</span>
            <span style="font-size: ${fmt(hintFontMm)}mm; line-height: 1.18;">${hint}</span>
          </div>
          <div style="display: flex; gap: 0.8mm; flex-shrink: 0;">
            ${cellsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
      ${COMMON_M08_STYLE}
      ${itemsHtml}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 2. サブモード B: アナグラム（anagram）
// -----------------------------------------------------------------------------

function renderAnagramHtml(
  data: AnagramData,
  params: M08Params & CommonParams,
  role: 'problem' | 'answer',
): string {
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;
  const n = data.items.length;

  const rowSlotMm = getRowSlotMm(n, role);
  const marginBottomMm = Math.min(2.4, Math.max(0.7, rowSlotMm * 0.16));
  const maxContentMm = Math.max(5.5, rowSlotMm - marginBottomMm - 0.3);

  const desiredFontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const boxSizeMm = Math.max(
    5.4,
    Math.min(9.2, desiredFontMm * 1.9, maxContentMm),
  );
  const fontMm = Math.max(2.8, Math.min(desiredFontMm, boxSizeMm * 0.52));
  const hintFontMm = Math.max(2.5, Math.min(fontMm * 0.85, 3.4));
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  const itemsHtml = data.items
    .map((item) => {
      const qNum = `問${item.index}`;
      const hint = item.categoryHint ? `【${esc(item.categoryHint)}】` : '';

      // シャッフルされた仮名
      const shuffledHtml = item.shuffledChars
        .map(
          (c) =>
            `<span style="display: inline-flex; align-items: center; justify-content: center; width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #333; border-radius: 1mm; margin: 0 0.4mm; font-weight: bold; font-size: ${fmt(boxSizeMm * 0.58)}mm; background: #F8F8F8;">${esc(c)}</span>`,
        )
        .join('');

      // 解答枠（空欄マスまたは模範解答）
      const answerChars = Array.from(item.answerKana);
      const answerCellsHtml = Array.from({ length: item.charCount })
        .map((_, cIdx) => {
          if (role === 'problem') {
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; margin: 0 0.4mm;"></span>`;
          } else {
            const ch = answerChars[cIdx] ?? '';
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(answerBorderMm)}mm solid #D00000; font-weight: bold; font-size: ${fmt(boxSizeMm * 0.6)}mm; color: #000; margin: 0 0.4mm;">${esc(ch)}</span>`;
          }
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; min-width: 0;">
            <span style="font-weight: bold; white-space: nowrap; min-width: ${fmt(fontMm * 3.1)}mm; margin-right: 1mm; flex-shrink: 0;">${qNum}.</span>
            ${hint ? `<span style="font-size: ${fmt(hintFontMm)}mm; margin-right: 1.5mm; color: #333; white-space: nowrap;">${hint}</span>` : ''}
            <div style="display: flex; flex-shrink: 0;">${shuffledHtml}</div>
          </div>
          <div style="display: flex; align-items: center; flex-shrink: 0;">
            <span style="font-size: ${fmt(fontMm * 1.1)}mm; margin: 0 1.5mm;">➔</span>
            <div style="display: flex;">${answerCellsHtml}</div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
      ${COMMON_M08_STYLE}
      ${itemsHtml}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 3. サブモード C: 意味カテゴリ分類（category）
// -----------------------------------------------------------------------------

function renderCategoryHtml(
  data: CategoryData,
  params: M08Params & CommonParams,
  role: 'problem' | 'answer',
): string {
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;
  const desiredFontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  if (data.categoryTask === 'findAll') {
    // findAll: 表グリッド形式（4列）
    const items = data.findAllItems ?? [];
    const gridCols = 4;
    const rows: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += gridCols) {
      rows.push(items.slice(i, i + gridCols));
    }

    const rowCount = Math.max(1, rows.length);
    const availTableMm = role === 'answer' ? 190 : 225;
    const cellHeightMm = Math.min(16, Math.floor((availTableMm / rowCount) * 10) / 10);
    const fontMm = Math.max(3.0, Math.min(desiredFontMm, 5.0, cellHeightMm * 0.35));

    const tableRowsHtml = rows
      .map((row) => {
        const cellsHtml = row
          .map((item) => {
            const wordHtml = formatVocabWord(item.entry, params.notation);
            let cellInner = wordHtml;
            if (role === 'answer' && item.isTarget) {
              cellInner = `<span style="border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.6mm 1.8mm; border-radius: 1.5mm; font-weight: bold;">${wordHtml}</span>`;
            }
            return `<td style="border: 0.2mm solid #CCC; text-align: center; height: ${fmt(cellHeightMm)}mm; vertical-align: middle; font-size: ${fmt(fontMm * 1.1)}mm;">${cellInner}</td>`;
          })
          .join('');
        return `<tr>${cellsHtml}</tr>`;
      })
      .join('');

    const targetNotice =
      role === 'answer' && data.totalTargets !== undefined
        ? `<div style="font-weight: bold; color: #D00000; margin-bottom: 1.5mm; text-align: right;">正解：全 ${data.totalTargets} 個</div>`
        : '';

    return `
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.3;">
        ${COMMON_M08_STYLE}
        ${targetNotice}
        <table style="width: 100%; border-collapse: collapse; margin-top: 1.5mm;">
          ${tableRowsHtml}
        </table>
      </div>
    `;
  }

  // oddOneOut: 仲間外れ選択（各問横並び）
  const items = data.oddItems ?? [];
  const n = items.length;
  const rowSlotMm = getRowSlotMm(n, role);
  const gapMm = Math.min(5.2, Math.max(1.0, rowSlotMm * 0.24));
  const padBottomMm = gapMm * 0.44;
  const marginBottomMm = gapMm * 0.56;
  const contentFactor = params.notation === 'kanjiRuby' ? 1.95 : 1.4;
  const maxFontForHeight = (rowSlotMm - gapMm - 0.4) / contentFactor;
  const maxFontForWidth = (params.groupSize ?? 4) >= 5 ? 4.3 : 5.0;
  const fontMm = Math.max(
    2.7,
    Math.min(desiredFontMm, maxFontForHeight, maxFontForWidth),
  );

  const itemsHtml = items
    .map((item) => {
      const qNum = `問${item.index}`;
      const choicesHtml = item.choices
        .map((c) => {
          const numCircle = ['①', '②', '③', '④', '⑤'][c.choiceIndex - 1] ?? `(${c.choiceIndex})`;
          const wordHtml = formatVocabWord(c.entry, params.notation);
          if (role === 'answer' && c.isOdd) {
            return `<span style="margin-right: 3.5mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.3mm 1.2mm; border-radius: 1mm; font-weight: bold; white-space: nowrap;">${numCircle} ${wordHtml}</span>`;
          }
          return `<span style="margin-right: 3.5mm; white-space: nowrap;">${numCircle} ${wordHtml}</span>`;
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; padding-bottom: ${fmt(padBottomMm)}mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center;">
          <span style="font-weight: bold; white-space: nowrap; min-width: ${fmt(fontMm * 3.1)}mm; margin-right: 2mm; flex-shrink: 0;">${qNum}.</span>
          <div style="flex: 1; display: flex; flex-wrap: nowrap; gap: 1.5mm; align-items: center; min-width: 0;">
            ${choicesHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
      ${COMMON_M08_STYLE}
      ${itemsHtml}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 4. サブモード D: 短文課題（sentence）
// -----------------------------------------------------------------------------

function renderSentenceHtml(
  data: SentenceData,
  params: M08Params & CommonParams,
  role: 'problem' | 'answer',
): string {
  const textScale = params.textScale ?? 100;
  const strokeScale = params.strokeScale ?? 100;
  const desiredFontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  if (data.sentenceTask === 'judgement') {
    // 意味正誤判定
    const items = data.judgementItems ?? [];
    const n = items.length;
    const rowSlotMm = getRowSlotMm(n, role);
    const gapMm = Math.min(5.0, Math.max(1.0, rowSlotMm * 0.24));
    const padBottomMm = gapMm * 0.42;
    const marginBottomMm = gapMm * 0.58;
    const maxContentMm = Math.max(4.5, rowSlotMm - gapMm - 0.4);
    const fontMm = Math.max(
      2.7,
      Math.min(desiredFontMm, maxContentMm / 1.45, role === 'answer' ? 3.8 : 4.5),
    );

    const itemsHtml = items
      .map((item) => {
        const qNum = `問${item.index}`;
        const text = esc(item.text);

        let answerBox = `<span style="border: ${fmt(borderMm)}mm solid #000; border-radius: 1mm; padding: 0.3mm 2.5mm; font-size: ${fmt(fontMm * 0.88)}mm; letter-spacing: 1.2mm; margin-left: 2mm; white-space: nowrap;">○・×</span>`;
        if (role === 'answer') {
          const mark = item.isValid ? '○ 正しい' : '× 誤り';
          answerBox = `
            <span style="border: ${fmt(answerBorderMm)}mm solid #D00000; border-radius: 1mm; padding: 0.2mm 1.5mm; font-weight: bold; color: #000; margin-left: 1.5mm; flex-shrink: 0; white-space: nowrap;">
              ${mark}
            </span>
            <span style="font-size: ${fmt(fontMm * 0.78)}mm; color: #333; margin-left: 1.5mm; white-space: nowrap;">（${esc(item.reason)}）</span>
          `;
        }

        return `
          <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; padding-bottom: ${fmt(padBottomMm)}mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span style="font-weight: bold; margin-right: 1.5mm;">${qNum}.</span>
              <span>${text}</span>
            </div>
            <div style="display: flex; align-items: center; flex-shrink: 0;">
              ${answerBox}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
        ${COMMON_M08_STYLE}
        ${itemsHtml}
      </div>
    `;
  }

  if (data.sentenceTask === 'particleChoice') {
    // 助詞選択
    const items = data.choiceItems ?? [];
    const n = items.length;
    const rowSlotMm = getRowSlotMm(n, role);
    const gapMm = Math.min(5.0, Math.max(1.0, rowSlotMm * 0.24));
    const padBottomMm = gapMm * 0.42;
    const marginBottomMm = gapMm * 0.58;
    const maxContentMm = Math.max(4.5, rowSlotMm - gapMm - 0.4);
    const fontMm = Math.max(2.7, Math.min(desiredFontMm, maxContentMm / 1.45, 4.5));

    const itemsHtml = items
      .map((item) => {
        const qNum = `問${item.index}`;
        const before = esc(item.before);
        const after = esc(item.after);

        const choicesHtml = item.choices
          .map((c) => {
            const numCircle = ['①', '②', '③'][c.choiceIndex - 1] ?? `(${c.choiceIndex})`;
            if (role === 'answer' && c.isCorrect) {
              return `<span style="margin-right: 2.5mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.2mm 1.2mm; border-radius: 1mm; font-weight: bold; white-space: nowrap;">${numCircle} ${esc(c.particle)}</span>`;
            }
            return `<span style="margin-right: 2.5mm; white-space: nowrap;">${numCircle} ${esc(c.particle)}</span>`;
          })
          .join('');

        const blankBox = role === 'problem'
          ? `<span style="display: inline-block; width: 7.5mm; border-bottom: ${fmt(borderMm * 1.5)}mm solid #000; margin: 0 1mm;"></span>`
          : `<span style="font-weight: bold; border-bottom: ${fmt(answerBorderMm)}mm solid #D00000; color: #000; padding: 0 1mm; margin: 0 1mm;">${esc(item.answerParticle)}</span>`;

        return `
          <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; padding-bottom: ${fmt(padBottomMm)}mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; padding-right: 2mm; min-width: 0;">
              <span style="font-weight: bold; margin-right: 1.5mm; white-space: nowrap;">${qNum}.</span>
              <span>${before}</span>
              ${blankBox}
              <span>${after}</span>
            </div>
            <div style="flex-shrink: 0; display: flex; align-items: center;">
              ${choicesHtml}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
        ${COMMON_M08_STYLE}
        ${itemsHtml}
      </div>
    `;
  }

  // particleBlank: 助詞空欄書き込み
  const items = data.blankItems ?? [];
  const n = items.length;
  const rowSlotMm = getRowSlotMm(n, role);
  const gapMm = Math.min(5.0, Math.max(1.0, rowSlotMm * 0.24));
  const padBottomMm = gapMm * 0.42;
  const marginBottomMm = gapMm * 0.58;
  const maxContentMm = Math.max(4.5, rowSlotMm - gapMm - 0.4);
  const fontMm = Math.max(2.7, Math.min(desiredFontMm, maxContentMm / 1.45, 4.5));
  const blankHeightMm = Math.min(6.0, Math.max(4.0, maxContentMm - 0.6));

  const itemsHtml = items
    .map((item) => {
      const qNum = `問${item.index}`;
      const before = esc(item.before);
      const after = esc(item.after);

      let blankBox = `<span style="display: inline-block; width: 9.5mm; height: ${fmt(blankHeightMm)}mm; border: ${fmt(borderMm)}mm solid #000; margin: 0 1.2mm; vertical-align: middle;"></span>`;
      if (role === 'answer') {
        let text = item.answer;
        if (item.acceptable.length > 0) {
          text += `（${item.acceptable.join('/')}も可）`;
        }
        blankBox = `<span style="display: inline-block; min-width: 9.5mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.2mm 1.2mm; border-radius: 1mm; font-weight: bold; color: #000; margin: 0 1.2mm; text-align: center; vertical-align: middle;">${esc(text)}</span>`;
      }

      return `
        <div class="m08-row" style="margin-bottom: ${fmt(marginBottomMm)}mm; padding-bottom: ${fmt(padBottomMm)}mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center;">
          <span style="font-weight: bold; white-space: nowrap; min-width: ${fmt(fontMm * 3.1)}mm; margin-right: 1.5mm; flex-shrink: 0;">${qNum}.</span>
          <div style="flex: 1; min-width: 0;">
            <span>${before}</span>
            ${blankBox}
            <span>${after}</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.25;">
      ${COMMON_M08_STYLE}
      ${itemsHtml}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// チェックリスト生成ヘルパー
// -----------------------------------------------------------------------------

export function buildM08Checklist(
  generated: M08GeneratedData,
  params: M08Params,
): ChecklistItem[] {
  switch (generated.subMode) {
    case 'fill':
      return generated.data.items.map((item) => ({
        id: `m08-fill-${item.index}`,
        label: `問${item.index}`,
        expected: `${formatVocabWordPlain(item.entry, params.notation)}（${item.answerKana}）`,
        points: 1,
      }));

    case 'anagram':
      return generated.data.items.map((item) => ({
        id: `m08-anagram-${item.index}`,
        label: `問${item.index}`,
        expected: `${formatVocabWordPlain(item.entry, params.notation)}（${item.answerKana}）`,
        points: 1,
      }));

    case 'category':
      if (generated.data.categoryTask === 'oddOneOut' && generated.data.oddItems) {
        return generated.data.oddItems.map((item) => {
          const numCircle = ['①', '②', '③', '④', '⑤'][item.answerChoiceIndex - 1] ?? `(${item.answerChoiceIndex})`;
          return {
            id: `m08-odd-${item.index}`,
            label: `問${item.index}`,
            expected: `${numCircle} ${formatVocabWordPlain(item.answerEntry, params.notation)}`,
            points: 1,
          };
        });
      }
      if (generated.data.categoryTask === 'findAll' && generated.data.findAllItems) {
        const targets = generated.data.findAllItems.filter((i) => i.isTarget);
        const targetList = targets.map((t) => formatVocabWordPlain(t.entry, params.notation)).join('、');
        return [
          {
            id: 'm08-findall-all',
            label: '正解語一覧',
            expected: `全${targets.length}個（${targetList}）`,
            points: targets.length,
          },
        ];
      }
      return [];

    case 'sentence':
      return buildSentenceChecklist(generated.data);
  }
}

// -----------------------------------------------------------------------------
// 教示文の決定
// -----------------------------------------------------------------------------

export function getM08Instruction(generated: M08GeneratedData): string {
  switch (generated.subMode) {
    case 'fill':
      return 'ヒントを読んで、空いているマスに文字を入れて言葉を完成させましょう。';
    case 'anagram':
      return '文字を正しく並べ替えて、意味の通る言葉を完成させましょう。';
    case 'category':
      if (generated.data.categoryTask === 'findAll') {
        const phrase = generated.data.targetPhrase ?? '指定された仲間';
        return `次の言葉の中から、【${phrase}】をすべて探して〇をつけましょう。`;
      }
      return '並んでいる言葉の中から、仲間外れのものを１つ選んで番号に〇をつけましょう。';
    case 'sentence':
      if (generated.data.sentenceTask === 'judgement') {
        return '文を読んで、意味が正しければ「○」、不自然であれば「×」に〇をつけましょう。';
      }
      if (generated.data.sentenceTask === 'particleChoice') {
        return '文の空欄に当てはまる適切な助詞を、選択肢の中から選んで〇をつけましょう。';
      }
      return '文の空欄（　）に当てはまる適切な助詞を書き入れましょう。';
  }
}

// -----------------------------------------------------------------------------
// メインエクスポート: renderM08Page
// -----------------------------------------------------------------------------

export function renderM08Page(
  generated: M08GeneratedData,
  params: M08Params & CommonParams,
  role: 'problem' | 'answer',
): PageBody {
  let content = '';

  switch (generated.subMode) {
    case 'fill':
      content = renderFillHtml(generated.data, params, role);
      break;
    case 'anagram':
      content = renderAnagramHtml(generated.data, params, role);
      break;
    case 'category':
      content = renderCategoryHtml(generated.data, params, role);
      break;
    case 'sentence':
      content = renderSentenceHtml(generated.data, params, role);
      break;
  }

  const instruction = getM08Instruction(generated);

  let markup = content;
  if (role === 'answer') {
    const checklist = buildM08Checklist(generated, params);
    if (checklist.length > 0) {
      let tablesBodyHtml = '';
      if (checklist.length > 5) {
        const mid = Math.ceil(checklist.length / 2);
        const leftHtml = checklistTableHtml(checklist.slice(0, mid));
        const rightHtml = checklistTableHtml(checklist.slice(mid));
        tablesBodyHtml = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; align-items: start;">
            <div>${leftHtml}</div>
            <div>${rightHtml}</div>
          </div>
        `;
      } else {
        tablesBodyHtml = checklistTableHtml(checklist);
      }

      markup = `
        ${content}
        <div class="m08-checklist-container" style="margin-top: 2mm; border-top: 0.3mm solid #999; padding-top: 1.5mm;">
          <div style="font-weight: bold; font-size: 3.1mm; margin-bottom: 1mm; line-height: 1.15;">【採点チェックリスト】</div>
          ${tablesBodyHtml}
        </div>
      `;
    }
  }

  return {
    kind: 'html',
    pageRole: role,
    markup,
    instruction,
    subLabel: role === 'answer' ? '【解答・採点シート（検者用）】' : undefined,
  };
}
