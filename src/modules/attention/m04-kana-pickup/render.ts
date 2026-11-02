/**
 * M04 仮名拾い・二重課題 SVG 描画
 * ARCHITECTURE.md §6, §8, §9 準拠
 */

import { answerCircle } from '../../../print/answerParts';
import {
  TYPOGRAPHY,
  type CommonParams,
  type ComprehensionQuestion,
  type GenerateContext,
  type GenerateResult,
  type M04Params,
  type PageBody,
} from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import type { M04ProblemData } from './logic';

const CIRCLED_NUMS = ['①', '②', '③'] as const;

/**
 * 内容確認問題ブロックの SVG を描画する。
 */
function renderQuestionsBlock(
  questions: readonly ComprehensionQuestion[],
  startY: number,
  bodyW: number,
  isAnswer: boolean,
): string {
  const elements: string[] = [];
  const startX = 10;
  const contentW = bodyW - 20;

  // 外枠
  elements.push(
    `<rect x="6" y="${fmt(startY)}" width="${fmt(bodyW - 12)}" height="${fmt(237 - startY - 4)}" rx="1.5" fill="#fafafa" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.3" stroke-dasharray="2 2" />`,
  );
  elements.push(
    `<text x="10" y="${fmt(startY + 6)}" font-size="3.5" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">【内容確認問題】（あてはまる番号に〇をつけてください）</text>`,
  );

  let currentY = startY + 14;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    // 質問文
    elements.push(
      `<text x="${fmt(startX)}" y="${fmt(currentY)}" font-size="3.2" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">問${i + 1}. ${esc(q.prompt)}</text>`,
    );
    currentY += 5.5;

    // 選択肢（3択）
    const choiceW = contentW / 3;
    for (let c = 0; c < 3; c++) {
      const choiceX = startX + c * choiceW;
      const isCorrect = isAnswer && q.answerIndex === c;
      const label = `${CIRCLED_NUMS[c]} ${esc(q.choices[c]!)}`;

      if (isCorrect) {
        // 解答用紙: 正解選択肢に赤枠強調
        elements.push(
          `<rect x="${fmt(choiceX - 1)}" y="${fmt(currentY - 3.5)}" width="${fmt(choiceW - 4)}" height="6" rx="1" fill="#ffebeb" stroke="#D00000" stroke-width="0.5" />`,
        );
        elements.push(
          `<text x="${fmt(choiceX)}" y="${fmt(currentY)}" font-size="3" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#D00000">${label}</text>`,
        );
      } else {
        elements.push(
          `<text x="${fmt(choiceX)}" y="${fmt(currentY)}" font-size="3" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${label}</text>`,
        );
      }
    }
    currentY += 8.5;
  }

  return `<g class="questions-block">\n    ${elements.join('\n    ')}\n  </g>`;
}

/**
 * 2ページ目専用の内容確認問題用紙 SVG を描画する。
 */
function renderQuestionsPageSvg(
  questions: readonly ComprehensionQuestion[],
  bodyW: number,
  bodyH: number,
  isAnswer: boolean,
): string {
  const elements: string[] = [];
  const startX = 14;
  const contentW = bodyW - 28;

  elements.push(
    `<rect x="8" y="10" width="${fmt(bodyW - 16)}" height="${fmt(bodyH - 20)}" rx="2" fill="#fafafa" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.4" />`,
  );
  elements.push(
    `<text x="14" y="20" font-size="4.2" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">【内容確認問題】（あてはまる番号に〇をつけてください）</text>`,
  );

  let currentY = 36;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    elements.push(
      `<text x="${fmt(startX)}" y="${fmt(currentY)}" font-size="3.8" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">問${i + 1}. ${esc(q.prompt)}</text>`,
    );
    currentY += 9;

    for (let c = 0; c < 3; c++) {
      const isCorrect = isAnswer && q.answerIndex === c;
      const label = `${CIRCLED_NUMS[c]} ${esc(q.choices[c]!)}`;

      if (isCorrect) {
        elements.push(
          `<rect x="${fmt(startX + 4)}" y="${fmt(currentY - 4)}" width="${fmt(contentW - 8)}" height="7.5" rx="1.5" fill="#ffebeb" stroke="#D00000" stroke-width="0.6" />`,
        );
        elements.push(
          `<text x="${fmt(startX + 6)}" y="${fmt(currentY)}" font-size="3.4" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#D00000">${label}</text>`,
        );
      } else {
        elements.push(
          `<text x="${fmt(startX + 6)}" y="${fmt(currentY)}" font-size="3.4" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${label}</text>`,
        );
      }
      currentY += 8.5;
    }
    currentY += 10;
  }

  return [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  <g class="questions-page">`,
    `    ${elements.join('\n    ')}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');
}

/**
 * M04（仮名拾い・二重課題）の用紙 SVG と結果オブジェクトを生成する。
 */
export function renderM04(
  ctx: GenerateContext,
  params: M04Params & CommonParams,
  data: M04ProblemData,
): GenerateResult {
  const strokeScale = params.strokeScale ?? 100;
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;

  const colAdvance = data.effCharSize * 1.05;
  const rowAdvance = data.effCharSize * 1.9;
  const startX = 8;
  const startY = 8;

  // 1) 文字グリッドの描画
  const textElements: string[] = [];
  const highlightElements: string[] = [];
  const rowCountElements: string[] = [];

  for (const line of data.lines) {
    const rowY = startY + line.row * rowAdvance + data.effCharSize / 2;

    for (const item of line.chars) {
      const charX = startX + item.colOffset * colAdvance + data.effCharSize / 2;

      // 文字本体（問題・解答共通で黒）
      textElements.push(
        `<text x="${fmt(charX)}" y="${fmt(rowY)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(data.effCharSize)}" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${esc(item.ch)}</text>`,
      );

      // 解答用ハイライト（ターゲット外周の赤丸）
      if (item.isTarget) {
        highlightElements.push(
          answerCircle(charX, rowY, data.effCharSize, strokeScale),
        );
      }
    }

    // 解答用行末正解数
    const lineEndCol = line.chars.length > 0 ? line.chars[line.chars.length - 1]!.colOffset : 0;
    const countX = Math.max(
      startX + (data.maxCols + 0.5) * colAdvance + 4,
      startX + (lineEndCol + 1.5) * colAdvance + 4,
    );
    rowCountElements.push(
      `<text x="${fmt(countX)}" y="${fmt(rowY)}" dominant-baseline="central" font-size="${fmt(Math.max(2.8, data.effCharSize * 0.7))}" font-family="${TYPOGRAPHY.fontFamily}" fill="#666666">（${line.targetCount}）</text>`,
    );
  }

  // 本文グリッド下端 y 座標
  const gridBottomY = startY + data.lines.length * rowAdvance;

  // 2) 内容確認問題の配置決定
  const hasQuestions = data.subMode === 'passage' && data.questions && data.questions.length > 0;
  const questions = data.questions ?? [];

  let renderQuestionsOnSamePage = false;
  let renderQuestionsOnNextPage = false;

  if (hasQuestions) {
    if (params.questionPlacement === 'samePage') {
      const remainingH = bodyH - gridBottomY - 4;
      const neededH = 14 + questions.length * 14;

      if (remainingH >= neededH) {
        renderQuestionsOnSamePage = true;
      } else {
        // 収まらない場合は自動的に2ページ目へ分離
        renderQuestionsOnNextPage = true;
        ctx.warn(
          'LAYOUT_SCALED',
          '文字サイズに対して用紙高さが不足したため、内容確認問題を2ページ目に出力しました',
        );
      }
    } else {
      // questionPlacement === 'nextPage'
      renderQuestionsOnNextPage = true;
    }
  }

  // 同一ページ用の設問ブロック
  const samePageQuestionsProblem = renderQuestionsOnSamePage
    ? renderQuestionsBlock(questions, gridBottomY + 4, bodyW, false)
    : '';
  const samePageQuestionsAnswer = renderQuestionsOnSamePage
    ? renderQuestionsBlock(questions, gridBottomY + 4, bodyW, true)
    : '';

  // 3) 教示文の組み立て
  const targetListStr = Array.from(data.targets)
    .map((c) => `「${c}」`)
    .join('');

  let problemInstruction: string;
  let answerInstruction: string;

  const qAnswerSummary = questions
    .map((q, i) => `問${i + 1}: ${CIRCLED_NUMS[q.answerIndex]}`)
    .join('　');

  if (data.subMode === 'random') {
    problemInstruction = `並んでいる文字の中から、${targetListStr}をすべて見つけて〇をつけてください。`;
    answerInstruction = [
      `【総正解数：${data.totalTargets} 個】`,
      '正解文字の外周を赤丸で囲み、各行の右端にその行の正解数を記載しています。',
    ].join('\n');
  } else {
    // passage
    problemInstruction = renderQuestionsOnNextPage
      ? `文章を読みながら${targetListStr}をすべて見つけて〇をつけ、次のページの確認問題に答えてください。`
      : `文章を読みながら${targetListStr}をすべて見つけて〇をつけ、最後に下の確認問題に答えてください。`;

    answerInstruction = [
      `【仮名拾い総正解数：${data.totalTargets} 個】`,
      questions.length > 0 ? `内容確認問題の正答：${qAnswerSummary}` : '',
      '正解文字の外周を赤丸で囲み、各行の右端にその行の正解数を記載しています。',
    ]
      .filter((s) => s.length > 0)
      .join('\n');
  }

  // 4) ページ組み立て
  const pages: PageBody[] = [];

  // 問題用紙 1ページ目
  const problemSvg1 = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  <g class="kana-text">`,
    `    ${textElements.join('\n    ')}`,
    `  </g>`,
    samePageQuestionsProblem ? `  ${samePageQuestionsProblem}` : '',
    `</svg>`,
  ].join('\n');

  pages.push({
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg1,
    instruction: problemInstruction,
  });

  // 2ページ目に問題がある場合
  if (renderQuestionsOnNextPage) {
    const problemSvg2 = renderQuestionsPageSvg(questions, bodyW, bodyH, false);
    pages.push({
      pageRole: 'problem',
      kind: 'svg',
      markup: problemSvg2,
      instruction: '文章の内容について、あてはまる番号に〇をつけてください。',
      subLabel: '【内容確認問題】',
    });
  }

  // 解答用紙 1ページ目
  const answerSvg1 = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  <g class="kana-text">`,
    `    ${textElements.join('\n    ')}`,
    `  </g>`,
    `  <g class="highlights">`,
    `    ${highlightElements.join('\n    ')}`,
    `  </g>`,
    `  <g class="row-counts">`,
    `    ${rowCountElements.join('\n    ')}`,
    `  </g>`,
    samePageQuestionsAnswer ? `  ${samePageQuestionsAnswer}` : '',
    `</svg>`,
  ].join('\n');

  pages.push({
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg1,
    instruction: answerInstruction,
    subLabel: '【解答・採点シート（検者用）】',
  });

  // 2ページ目に解答がある場合
  if (renderQuestionsOnNextPage) {
    const answerSvg2 = renderQuestionsPageSvg(questions, bodyW, bodyH, true);
    pages.push({
      pageRole: 'answer',
      kind: 'svg',
      markup: answerSvg2,
      instruction: `【内容確認問題の正答】\n${qAnswerSummary}`,
      subLabel: '【解答・採点シート（内容確認問題）】',
    });
  }

  return {
    pages,
  };
}
