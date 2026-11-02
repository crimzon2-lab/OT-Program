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

  const fontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);
  const boxSizeMm = Math.max(7, Math.min(10, fontMm * 2));

  const itemsHtml = data.items
    .map((item) => {
      const qNum = `問${item.index}`;
      const hint = esc(item.hintText);

      const cellsHtml = item.cells
        .map((ch, cIdx) => {
          if (role === 'problem') {
            const displayChar = ch !== null ? esc(ch) : '';
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; font-size: ${fmt(fontMm * 1.1)}mm;">${displayChar}</span>`;
          } else {
            // 解答用紙：全文字マスに正解の文字を表示（伏せ字だった箇所は赤太枠または太字黒で明示）
            const answerChar = Array.from(item.answerKana)[cIdx] ?? '';
            const isRevealed = ch !== null;
            const style = isRevealed
              ? `width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; font-size: ${fmt(fontMm * 1.1)}mm;`
              : `width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(answerBorderMm)}mm solid #D00000; font-weight: bold; font-size: ${fmt(fontMm * 1.2)}mm; color: #000;`;
            return `<span class="char-box" style="${style}">${esc(answerChar)}</span>`;
          }
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: 2mm; display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1; padding-right: 3mm;">
            <span style="font-weight: bold; margin-right: 2mm;">${qNum}.</span>
            <span style="font-size: ${fmt(fontMm * 0.95)}mm; line-height: 1.3;">${hint}</span>
          </div>
          <div style="display: flex; gap: 1mm; flex-shrink: 0;">
            ${cellsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
      <style>
        .char-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background: #FFF;
        }
      </style>
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

  const fontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);
  const boxSizeMm = Math.max(7, Math.min(10, fontMm * 2));

  const itemsHtml = data.items
    .map((item) => {
      const qNum = `問${item.index}`;
      const hint = item.categoryHint ? `【${esc(item.categoryHint)}】` : '';

      // シャッフルされた仮名
      const shuffledHtml = item.shuffledChars
        .map(
          (c) =>
            `<span style="display: inline-flex; align-items: center; justify-content: center; width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #333; border-radius: 1mm; margin: 0 0.5mm; font-weight: bold; font-size: ${fmt(fontMm * 1.15)}mm; background: #F8F8F8;">${esc(c)}</span>`,
        )
        .join('');

      // 解答枠（空欄マスまたは模範解答）
      const answerChars = Array.from(item.answerKana);
      const answerCellsHtml = Array.from({ length: item.charCount })
        .map((_, cIdx) => {
          if (role === 'problem') {
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(borderMm)}mm solid #000; margin: 0 0.5mm;"></span>`;
          } else {
            const ch = answerChars[cIdx] ?? '';
            return `<span class="char-box" style="width: ${fmt(boxSizeMm)}mm; height: ${fmt(boxSizeMm)}mm; border: ${fmt(answerBorderMm)}mm solid #D00000; font-weight: bold; font-size: ${fmt(fontMm * 1.2)}mm; color: #000; margin: 0 0.5mm;">${esc(ch)}</span>`;
          }
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: 2.5mm; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <span style="font-weight: bold; width: 8mm;">${qNum}.</span>
            ${hint ? `<span style="font-size: ${fmt(fontMm * 0.9)}mm; margin-right: 2mm; color: #333;">${hint}</span>` : ''}
            <div style="display: flex;">${shuffledHtml}</div>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-size: ${fmt(fontMm * 1.2)}mm; margin: 0 2mm;">➔</span>
            <div style="display: flex;">${answerCellsHtml}</div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
      <style>
        .char-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background: #FFF;
        }
      </style>
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
  const fontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  if (data.categoryTask === 'findAll') {
    // findAll: 表グリッド形式（4列）
    const items = data.findAllItems ?? [];
    const gridCols = 4;
    const rows: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += gridCols) {
      rows.push(items.slice(i, i + gridCols));
    }

    const tableRowsHtml = rows
      .map((row) => {
        const cellsHtml = row
          .map((item) => {
            const wordHtml = formatVocabWord(item.entry, params.notation);
            let cellInner = wordHtml;
            if (role === 'answer' && item.isTarget) {
              cellInner = `<span style="border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.8mm 2mm; border-radius: 1.5mm; font-weight: bold;">${wordHtml}</span>`;
            }
            return `<td style="border: 0.2mm solid #CCC; text-align: center; height: 16mm; vertical-align: middle; font-size: ${fmt(fontMm * 1.15)}mm;">${cellInner}</td>`;
          })
          .join('');
        return `<tr>${cellsHtml}</tr>`;
      })
      .join('');

    const targetNotice =
      role === 'answer' && data.totalTargets !== undefined
        ? `<div style="font-weight: bold; color: #D00000; margin-bottom: 2mm; text-align: right;">正解：全 ${data.totalTargets} 個</div>`
        : '';

    return `
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
        ${targetNotice}
        <table style="width: 100%; border-collapse: collapse; margin-top: 2mm;">
          ${tableRowsHtml}
        </table>
      </div>
    `;
  }

  // oddOneOut: 仲間外れ選択（各問横並び）
  const items = data.oddItems ?? [];
  const itemsHtml = items
    .map((item) => {
      const qNum = `問${item.index}`;
      const choicesHtml = item.choices
        .map((c) => {
          const numCircle = ['①', '②', '③', '④', '⑤'][c.choiceIndex - 1] ?? `(${c.choiceIndex})`;
          const wordHtml = formatVocabWord(c.entry, params.notation);
          if (role === 'answer' && c.isOdd) {
            return `<span style="margin-right: 4mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.5mm 1.5mm; border-radius: 1mm; font-weight: bold;">${numCircle} ${wordHtml}</span>`;
          }
          return `<span style="margin-right: 4mm;">${numCircle} ${wordHtml}</span>`;
        })
        .join('');

      return `
        <div class="m08-row" style="margin-bottom: 3.5mm; padding-bottom: 2.5mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center;">
          <span style="font-weight: bold; width: 8mm; flex-shrink: 0;">${qNum}.</span>
          <div style="flex: 1; display: flex; flex-wrap: wrap; gap: 2mm; align-items: center;">
            ${choicesHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
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
  const fontMm = TYPOGRAPHY.baseFontMm * (textScale / 100);
  const borderMm = 0.3 * (strokeScale / 100);
  const answerBorderMm = 0.6 * (strokeScale / 100);

  if (data.sentenceTask === 'judgement') {
    // 意味正誤判定
    const items = data.judgementItems ?? [];
    const itemsHtml = items
      .map((item) => {
        const qNum = `問${item.index}`;
        const text = esc(item.text);

        let answerBox = `<span style="border: ${fmt(borderMm)}mm solid #000; border-radius: 1mm; padding: 0.5mm 3mm; font-size: ${fmt(fontMm * 0.9)}mm; letter-spacing: 1.5mm; margin-left: 2mm;">○・×</span>`;
        if (role === 'answer') {
          const mark = item.isValid ? '○ 正しい' : '× 誤り';
          answerBox = `
            <span style="border: ${fmt(answerBorderMm)}mm solid #D00000; border-radius: 1mm; padding: 0.5mm 2mm; font-weight: bold; color: #000; margin-left: 2mm; flex-shrink: 0;">
              ${mark}
            </span>
            <span style="font-size: ${fmt(fontMm * 0.85)}mm; color: #333; margin-left: 2mm;">（${esc(item.reason)}）</span>
          `;
        }

        return `
          <div class="m08-row" style="margin-bottom: 3.5mm; padding-bottom: 2mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1;">
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
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
        ${itemsHtml}
      </div>
    `;
  }

  if (data.sentenceTask === 'particleChoice') {
    // 助詞選択
    const items = data.choiceItems ?? [];
    const itemsHtml = items
      .map((item) => {
        const qNum = `問${item.index}`;
        const before = esc(item.before);
        const after = esc(item.after);

        const choicesHtml = item.choices
          .map((c) => {
            const numCircle = ['①', '②', '③'][c.choiceIndex - 1] ?? `(${c.choiceIndex})`;
            if (role === 'answer' && c.isCorrect) {
              return `<span style="margin-right: 3mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.5mm 1.5mm; border-radius: 1mm; font-weight: bold;">${numCircle} ${esc(c.particle)}</span>`;
            }
            return `<span style="margin-right: 3mm;">${numCircle} ${esc(c.particle)}</span>`;
          })
          .join('');

        const blankBox = role === 'problem'
          ? `<span style="display: inline-block; width: 8mm; border-bottom: ${fmt(borderMm * 1.5)}mm solid #000; margin: 0 1mm;"></span>`
          : `<span style="font-weight: bold; border-bottom: ${fmt(answerBorderMm)}mm solid #D00000; color: #000; padding: 0 1mm; margin: 0 1mm;">${esc(item.answerParticle)}</span>`;

        return `
          <div class="m08-row" style="margin-bottom: 3.5mm; padding-bottom: 2mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; padding-right: 2mm;">
              <span style="font-weight: bold; margin-right: 1.5mm;">${qNum}.</span>
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
      <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
        ${itemsHtml}
      </div>
    `;
  }

  // particleBlank: 助詞空欄書き込み
  const items = data.blankItems ?? [];
  const itemsHtml = items
    .map((item) => {
      const qNum = `問${item.index}`;
      const before = esc(item.before);
      const after = esc(item.after);

      let blankBox = `<span style="display: inline-block; width: 10mm; height: 6mm; border: ${fmt(borderMm)}mm solid #000; margin: 0 1.5mm; vertical-align: middle;"></span>`;
      if (role === 'answer') {
        let text = item.answer;
        if (item.acceptable.length > 0) {
          text += `（${item.acceptable.join('/')}も可）`;
        }
        blankBox = `<span style="display: inline-block; min-width: 10mm; border: ${fmt(answerBorderMm)}mm solid #D00000; padding: 0.5mm 1.5mm; border-radius: 1mm; font-weight: bold; color: #000; margin: 0 1.5mm; text-align: center; vertical-align: middle;">${esc(text)}</span>`;
      }

      return `
        <div class="m08-row" style="margin-bottom: 3.5mm; padding-bottom: 2mm; border-bottom: 0.15mm dashed #DDD; display: flex; align-items: center;">
          <span style="font-weight: bold; width: 8mm; flex-shrink: 0;">${qNum}.</span>
          <div style="flex: 1;">
            <span>${before}</span>
            ${blankBox}
            <span>${after}</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="m08-container" style="font-family: ${esc(TYPOGRAPHY.fontFamily)}; font-size: ${fmt(fontMm)}mm; line-height: 1.4;">
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
    const tableHtml = checklistTableHtml(checklist);
    if (tableHtml) {
      markup = `
        ${content}
        <div class="m08-checklist-container" style="margin-top: 4mm; border-top: 0.3mm solid #999; padding-top: 2mm;">
          <div style="font-weight: bold; font-size: ${fmt(TYPOGRAPHY.baseFontMm * 0.9)}mm; margin-bottom: 1.5mm;">【採点チェックリスト】</div>
          ${tableHtml}
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
