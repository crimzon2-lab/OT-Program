/**
 * 役割別ヘッダー HTML レンダラー
 * ARCHITECTURE.md §3.6 準拠
 */

import type { RenderedPage } from '../types/schema';
import { esc } from '../utils/html';

/**
 * ページの役割 (problem / stimulus / answer) に応じたヘッダー HTML を生成する
 */
export function renderHeaderHtml(page: RenderedPage): string {
  const role = page.body.pageRole;
  const titleText = esc(page.title);
  const seedCodeText = esc(page.seedCode);

  let subTitleHtml = '';
  let row2Html = '';

  if (role === 'problem') {
    if (page.body.subLabel) {
      subTitleHtml = `<span class="sheet__sub-title">${esc(page.body.subLabel)}</span>`;
    }
    row2Html = [
      `実施日 <span class="sheet__blank sheet__blank--date">____年__月__日</span>`,
      `氏名・ID <span class="sheet__blank sheet__blank--name">____________</span>`,
      `所要時間 <span class="sheet__blank sheet__blank--time">____分____秒</span>`,
      `メモ・スコア <span class="sheet__blank sheet__blank--score">____________</span>`,
    ].join('　');
  } else if (role === 'stimulus') {
    const defaultSub = '【提示用シート】';
    const sub = page.body.subLabel ? esc(page.body.subLabel) : defaultSub;
    subTitleHtml = `<span class="sheet__sub-title">${sub}</span>`;
    // 2行目の患者記入欄は出さない
    row2Html = '';
  } else if (role === 'answer') {
    const defaultSub = '【解答・採点シート（検者用）】';
    const sub = page.body.subLabel ? esc(page.body.subLabel) : defaultSub;
    subTitleHtml = `<span class="sheet__sub-title">${sub}</span>`;
    row2Html = [
      `検者 <span class="sheet__blank sheet__blank--examiner">________</span>`,
      `得点 <span class="sheet__blank sheet__blank--score">________</span>`,
    ].join('　');
  }

  const bottomRowHtml = row2Html
    ? `<div class="sheet__header-row sheet__header-row--bottom">${row2Html}</div>`
    : `<div class="sheet__header-row sheet__header-row--empty"></div>`;

  return [
    `<header class="sheet__header">`,
    `  <div class="sheet__header-row sheet__header-row--top">`,
    `    <div class="sheet__title-box">`,
    `      <span class="sheet__title">${titleText}</span>`,
    subTitleHtml ? `      ${subTitleHtml}` : '',
    `    </div>`,
    `    <div class="sheet__seed-code">${seedCodeText}</div>`,
    `  </div>`,
    `  ${bottomRowHtml}`,
    `</header>`,
  ]
    .filter(Boolean)
    .join('\n');
}
