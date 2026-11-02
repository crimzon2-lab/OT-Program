/**
 * M10: 金銭管理・買い物計算 SVG 描画
 * ARCHITECTURE.md §6, §8, §9, §11.2 準拠
 */

import { answerCircle, answerRect } from '../../../print/answerParts';
import {
  BILL_DRAW_SCALE,
  BILL_SPECS,
  BODY_BOX,
  COIN_SPECS,
  TYPOGRAPHY,
  type CommonParams,
  type Denomination,
  type GenerateContext,
  type GenerateResult,
  type M10Params,
  type PageBody,
} from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import { renderMoneySvgItem } from './coins';
import {
  generateCoinTotalProblems,
  generatePaymentProblems,
  type CoinTotalProblem,
  type PaymentProblem,
} from './money';
import { generateShoppingData, type ShoppingData } from './shopping';

interface PlacedMoney {
  readonly id: number;
  readonly denom: Denomination;
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
  readonly isCoin: boolean;
}

/**
 * サブモード coinTotal の描画
 */
function renderCoinTotal(
  problems: readonly CoinTotalProblem[],
  bodyW: number,
  bodyH: number,
  strokeScale: number,
  textScale: number,
  isAnswer: boolean,
): string {
  const Q = problems.length;
  const rowH = (bodyH - 8) / Q;
  const baseStroke = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const font = TYPOGRAPHY.fontFamily;
  const ink = TYPOGRAPHY.inkColor;
  const scale = Q >= 5 ? 0.78 : Q >= 4 ? 0.85 : 0.95;

  const elements: string[] = [];

  for (let q = 0; q < Q; q++) {
    const prob = problems[q]!;
    const topY = 4 + q * rowH;

    // 区切り枠または下線
    if (q > 0) {
      elements.push(
        `<line x1="6" y1="${fmt(topY)}" x2="${fmt(bodyW - 6)}" y2="${fmt(topY)}" stroke="#CCCCCC" stroke-width="0.3" stroke-dasharray="2 2" />`,
      );
    }

    // 問題番号
    elements.push(
      `<text x="8" y="${fmt(topY + 7)}" font-size="${fmt(4.2 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}">（${prob.id}）</text>`,
    );

    // 硬貨・紙幣のレイアウト配置
    let curX = 24;
    let curY = topY + rowH * 0.42;
    const maxX = bodyW - 60;
    const lineH = 18 * scale;

    for (const denom of prob.items) {
      const isCoin = denom <= 500;
      const w = isCoin
        ? COIN_SPECS[denom as 1 | 5 | 10 | 50 | 100 | 500].diameterMm * scale
        : BILL_SPECS[denom as 1000 | 5000 | 10000].widthMm * BILL_DRAW_SCALE * scale;

      if (curX + w > maxX) {
        curX = 24;
        curY += lineH;
      }

      const cx = curX + w / 2;
      const cy = curY;
      const rendered = renderMoneySvgItem(denom, cx, cy, scale, strokeScale);
      elements.push(rendered.svg);

      curX += w + 2.5 * scale;
    }

    // 右側の記入欄
    const answerX = bodyW - 48;
    const answerY = topY + rowH * 0.48;

    elements.push(
      `<text x="${fmt(answerX)}" y="${fmt(answerY)}" font-size="${fmt(4.5 * (textScale / 100))}" font-family="${font}" fill="${ink}" text-anchor="end" dominant-baseline="central">合計</text>`,
      `<rect x="${fmt(answerX + 3)}" y="${fmt(answerY - 6)}" width="36" height="12" fill="#FFFFFF" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.5" />`,
      `<text x="${fmt(answerX + 41)}" y="${fmt(answerY)}" font-size="${fmt(4.5 * (textScale / 100))}" font-family="${font}" fill="${ink}" text-anchor="start" dominant-baseline="central">円</text>`,
    );

    if (isAnswer) {
      // 解答金額
      elements.push(
        `<text x="${fmt(answerX + 21)}" y="${fmt(answerY)}" font-size="${fmt(5.0 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="middle" dominant-baseline="central">${fmt(prob.totalAmount)}</text>`,
      );
      // 内訳
      const breakdownText = prob.breakdown.map((b) => `${b.denom}円×${b.count}`).join(', ');
      elements.push(
        `<text x="${fmt(answerX + 40)}" y="${fmt(answerY + 9)}" font-size="${fmt(2.6 * (textScale / 100))}" font-family="${font}" fill="#555555" text-anchor="end" dominant-baseline="central">${esc(breakdownText)}</text>`,
      );
    }
  }

  return `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">\n${elements.join('\n')}\n</svg>`;
}

/**
 * サブモード payment の描画
 */
function renderPayment(
  problems: readonly PaymentProblem[],
  bodyW: number,
  bodyH: number,
  strokeScale: number,
  textScale: number,
  isAnswer: boolean,
): string {
  const Q = problems.length;
  const rowH = (bodyH - 8) / Q;
  const font = TYPOGRAPHY.fontFamily;
  const ink = TYPOGRAPHY.inkColor;
  const scale = 0.85;

  const elements: string[] = [];
  const answerHighlights: string[] = [];

  for (let q = 0; q < Q; q++) {
    const prob = problems[q]!;
    const topY = 4 + q * rowH;

    if (q > 0) {
      elements.push(
        `<line x1="6" y1="${fmt(topY)}" x2="${fmt(bodyW - 6)}" y2="${fmt(topY)}" stroke="#CCCCCC" stroke-width="0.3" stroke-dasharray="2 2" />`,
      );
    }

    // 問題ヘッダー
    elements.push(
      `<text x="8" y="${fmt(topY + 6)}" font-size="${fmt(4.2 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}">（${prob.id}） 支払う金額： <tspan font-size="${fmt(4.8 * (textScale / 100))}">${fmt(prob.price)}</tspan> 円</text>`,
    );

    // 手持ち財布の硬貨・紙幣配置
    let curX = 14;
    let curY = topY + 18;
    const maxX = bodyW - 12;
    const lineH = 19 * scale;
    const placedList: PlacedMoney[] = [];

    for (const item of prob.wallet) {
      const isCoin = item.denom <= 500;
      const w = isCoin
        ? COIN_SPECS[item.denom as 1 | 5 | 10 | 50 | 100 | 500].diameterMm * scale
        : BILL_SPECS[item.denom as 1000 | 5000 | 10000].widthMm * BILL_DRAW_SCALE * scale;
      const h = isCoin
        ? w
        : BILL_SPECS[item.denom as 1000 | 5000 | 10000].heightMm * BILL_DRAW_SCALE * scale;

      if (curX + w > maxX) {
        curX = 14;
        curY += lineH;
      }

      const cx = curX + w / 2;
      const cy = curY;
      placedList.push({ id: item.id, denom: item.denom, cx, cy, w, h, isCoin });

      const rendered = renderMoneySvgItem(item.denom, cx, cy, scale, strokeScale);
      elements.push(rendered.svg);

      curX += w + 3.0 * scale;
    }

    // 解答ハイライト（支払いに使う硬貨に赤丸、紙幣に赤角丸枠）
    if (isAnswer) {
      const selectedSet = new Set(prob.selectedIds);
      let paySum = 0;

      for (const p of placedList) {
        if (selectedSet.has(p.id)) {
          paySum += p.denom;
          if (p.isCoin) {
            // 硬貨: answerCircle
            answerHighlights.push(answerCircle(p.cx, p.cy, p.w, strokeScale));
          } else {
            // 紙幣: answerRect
            answerHighlights.push(answerRect(p.cx - p.w / 2 - 1, p.cy - p.h / 2 - 1, p.w + 2, p.h + 2, strokeScale));
          }
        }
      }

      // 解答説明
      const explainY = topY + rowH - 4;
      const desc = prob.changeAmount > 0
        ? `【解答】支払い合計：${paySum} 円　おつり：${prob.changeAmount} 円（硬貨 ${prob.changeCoinsCount} 枚）`
        : `【解答】ちょうど ${paySum} 円を支払います`;

      elements.push(
        `<text x="14" y="${fmt(explainY)}" font-size="${fmt(3.2 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000">${esc(desc)}</text>`,
      );
    }
  }

  return [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    elements.join('\n'),
    answerHighlights.join('\n'),
    `</svg>`,
  ].join('\n');
}

/**
 * サブモード shopping の描画
 */
function renderShopping(
  data: ShoppingData,
  bodyW: number,
  bodyH: number,
  strokeScale: number,
  textScale: number,
  isAnswer: boolean,
): string {
  const font = TYPOGRAPHY.fontFamily;
  const ink = TYPOGRAPHY.inkColor;
  const baseStroke = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const elements: string[] = [];

  // 1. 上部：商品価格表
  const tableTop = 6;
  const tableH = 75;
  const tableW = bodyW - 12;
  const colW = tableW / 2;

  elements.push(
    `<rect x="6" y="${fmt(tableTop)}" width="${fmt(tableW)}" height="${fmt(tableH)}" fill="#FAFAFA" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.5" />`,
    `<rect x="6" y="${fmt(tableTop)}" width="${fmt(tableW)}" height="8" fill="#EEEEEE" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
    `<text x="${fmt(bodyW / 2)}" y="${fmt(tableTop + 5.2)}" font-size="${fmt(4.0 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}" text-anchor="middle">商品価格表</text>`,
    `<line x1="${fmt(6 + colW)}" y1="${fmt(tableTop + 8)}" x2="${fmt(6 + colW)}" y2="${fmt(tableTop + tableH)}" stroke="#CCCCCC" stroke-width="0.3" />`,
  );

  const halfLen = Math.ceil(data.priceTable.length / 2);
  const rowHeight = (tableH - 8) / halfLen;

  for (let i = 0; i < data.priceTable.length; i++) {
    const item = data.priceTable[i]!;
    const col = i < halfLen ? 0 : 1;
    const row = i < halfLen ? i : i - halfLen;
    const itemX = 6 + col * colW + 4;
    const itemY = tableTop + 8 + (row + 0.5) * rowHeight;

    const discountTag = (data.level === 'discount' && (item.price % 10 === 0 || item.price % 2 === 0))
      ? ''
      : '';

    elements.push(
      `<text x="${fmt(itemX)}" y="${fmt(itemY + 1.2)}" font-size="${fmt(3.2 * (textScale / 100))}" font-family="${font}" fill="${ink}">・${esc(item.name)}（${esc(item.unit)}）</text>`,
      `<text x="${fmt(itemX + colW - 8)}" y="${fmt(itemY + 1.2)}" font-size="${fmt(3.4 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}" text-anchor="end">${fmt(item.price)} 円${discountTag}</text>`,
    );

    if (row < halfLen - 1) {
      elements.push(
        `<line x1="${fmt(6 + col * colW + 2)}" y1="${fmt(tableTop + 8 + (row + 1) * rowHeight)}" x2="${fmt(6 + (col + 1) * colW - 2)}" y2="${fmt(tableTop + 8 + (row + 1) * rowHeight)}" stroke="#E5E5E5" stroke-width="0.2" />`,
      );
    }
  }

  // 2. 下部：課題エリア
  const taskTop = tableTop + tableH + 6;

  if (data.level === 'budget') {
    // budget 課題
    elements.push(
      `<text x="8" y="${fmt(taskTop + 5)}" font-size="${fmt(4.2 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}">【 予算内の買い物 】</text>`,
      `<text x="8" y="${fmt(taskTop + 14)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">予算： <tspan font-weight="bold" font-size="${fmt(5.0 * (textScale / 100))}">${fmt(data.budgetAmount)}</tspan> 円</text>`,
      `<text x="8" y="${fmt(taskTop + 22)}" font-size="${fmt(3.4 * (textScale / 100))}" font-family="${font}" fill="${ink}">下の候補商品から、予算以内で合計金額が最も高くなる組み合わせを選びましょう。</text>`,
    );

    // 候補商品一覧
    let candY = taskTop + 30;
    const selectedSet = new Set(data.bestCombinationIds);

    for (let c = 0; c < data.candidateItems.length; c++) {
      const cand = data.candidateItems[c]!;
      const isChosen = selectedSet.has(cand.id);
      const boxColor = isAnswer && isChosen ? '#CC0000' : ink;
      const checkMark = isAnswer && isChosen ? '✔' : '☐';

      elements.push(
        `<rect x="10" y="${fmt(candY - 4)}" width="${fmt(bodyW - 20)}" height="10" fill="${isAnswer && isChosen ? '#FFF5F5' : '#FFFFFF'}" stroke="${boxColor}" stroke-width="${fmt(isAnswer && isChosen ? baseStroke * 1.5 : 0.3)}" rx="0.4" />`,
        `<text x="14" y="${fmt(candY + 2.5)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${boxColor}">${checkMark} ${esc(cand.name)}（${esc(cand.unit)}）</text>`,
        `<text x="${fmt(bodyW - 16)}" y="${fmt(candY + 2.5)}" font-size="${fmt(4.0 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${boxColor}" text-anchor="end">${fmt(cand.price)} 円</text>`,
      );
      candY += 12;
    }

    // 合計とおつり記入枠
    const calcY = candY + 6;
    elements.push(
      `<rect x="10" y="${fmt(calcY)}" width="${fmt(bodyW - 20)}" height="26" fill="#FFFFFF" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.5" />`,
      `<text x="16" y="${fmt(calcY + 9)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">選んだ商品の合計金額： ＿＿＿＿＿＿ 円</text>`,
      `<text x="16" y="${fmt(calcY + 19)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">予算の残り（おつり）： ＿＿＿＿＿＿ 円</text>`,
    );

    if (isAnswer) {
      elements.push(
        `<text x="${fmt(bodyW - 40)}" y="${fmt(calcY + 9)}" font-size="${fmt(4.5 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="end">${fmt(data.bestTotalAmount)} 円</text>`,
        `<text x="${fmt(bodyW - 40)}" y="${fmt(calcY + 19)}" font-size="${fmt(4.5 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="end">${fmt(data.bestRemainingBudget)} 円</text>`,
      );
    }
  } else {
    // basic または discount 課題
    elements.push(
      `<text x="8" y="${fmt(taskTop + 5)}" font-size="${fmt(4.2 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="${ink}">【 買い物リスト 】</text>`,
    );

    let listY = taskTop + 12;
    for (const item of data.shoppingList) {
      let discountText = '';
      if (item.discount === '10percent') {
        discountText = '【10%引き】';
      } else if (item.discount === 'half') {
        discountText = '【半額】';
      }

      const qtyText = item.quantity > 1 ? ` × ${item.quantity}個` : '';
      elements.push(
        `<rect x="10" y="${fmt(listY)}" width="${fmt(bodyW - 20)}" height="11" fill="#FFFFFF" stroke="${ink}" stroke-width="0.3" rx="0.4" />`,
        `<text x="14" y="${fmt(listY + 7)}" font-size="${fmt(3.8 * (textScale / 100))}" font-family="${font}" fill="${ink}">・${esc(item.item.name)}${qtyText} <tspan fill="#CC0000" font-weight="bold">${discountText}</tspan></text>`,
      );

      if (isAnswer) {
        let calcFormula = `${item.item.price}円`;
        if (item.discount === '10percent') {
          calcFormula = `${item.item.price}円×0.9 = ${item.unitPrice}円`;
        } else if (item.discount === 'half') {
          calcFormula = `${item.item.price}円÷2 = ${item.unitPrice}円`;
        }
        if (item.quantity > 1) {
          calcFormula += ` × ${item.quantity} = ${item.subtotal}円`;
        } else {
          calcFormula = `${item.subtotal}円`;
        }
        elements.push(
          `<text x="${fmt(bodyW - 16)}" y="${fmt(listY + 7)}" font-size="${fmt(3.6 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="end">${esc(calcFormula)}</text>`,
        );
      } else {
        elements.push(
          `<text x="${fmt(bodyW - 16)}" y="${fmt(listY + 7)}" font-size="${fmt(3.6 * (textScale / 100))}" font-family="${font}" fill="#999999" text-anchor="end">＿＿＿＿ 円</text>`,
        );
      }

      listY += 13;
    }

    // 所持金とおつり計算欄
    const payAreaY = listY + 4;
    elements.push(
      `<rect x="10" y="${fmt(payAreaY)}" width="${fmt(bodyW - 20)}" height="32" fill="#FAFAFA" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.5" />`,
      `<text x="16" y="${fmt(payAreaY + 8)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">出したお金（所持金）： <tspan font-weight="bold">${fmt(data.walletAmount)}</tspan> 円</text>`,
      `<text x="16" y="${fmt(payAreaY + 18)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">商品の合計金額： ＿＿＿＿＿＿ 円</text>`,
      `<text x="16" y="${fmt(payAreaY + 27)}" font-size="${fmt(4.0 * (textScale / 100))}" font-family="${font}" fill="${ink}">おつり： ＿＿＿＿＿＿ 円</text>`,
    );

    if (isAnswer) {
      elements.push(
        `<text x="${fmt(bodyW - 35)}" y="${fmt(payAreaY + 18)}" font-size="${fmt(4.5 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="end">${fmt(data.totalAmount)} 円</text>`,
        `<text x="${fmt(bodyW - 35)}" y="${fmt(payAreaY + 27)}" font-size="${fmt(4.5 * (textScale / 100))}" font-weight="bold" font-family="${font}" fill="#CC0000" text-anchor="end">${fmt(data.changeAmount)} 円</text>`,
      );
    }
  }

  return `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">\n${elements.join('\n')}\n</svg>`;
}

/**
 * M10 レンダリング主関数
 */
export function renderM10(
  ctx: GenerateContext,
  params: M10Params & CommonParams,
): GenerateResult {
  const body = BODY_BOX.portrait;
  const strokeScale = params.strokeScale ?? 100;
  const textScale = params.textScale ?? 100;

  let problemSvg = '';
  let answerSvg = '';
  let instruction = '';
  let answerInstruction = '';

  switch (params.subMode) {
    case 'coinTotal': {
      const problems = generateCoinTotalProblems(ctx, params);
      problemSvg = renderCoinTotal(problems, body.widthMm, body.heightMm, strokeScale, textScale, false);
      answerSvg = renderCoinTotal(problems, body.widthMm, body.heightMm, strokeScale, textScale, true);
      instruction = '各問題のお金を数えて、合計金額を書きましょう。';
      answerInstruction = '【解答】各問題の合計金額と金種内訳';
      break;
    }

    case 'payment': {
      const problems = generatePaymentProblems(ctx, params);
      problemSvg = renderPayment(problems, body.widthMm, body.heightMm, strokeScale, textScale, false);
      answerSvg = renderPayment(problems, body.widthMm, body.heightMm, strokeScale, textScale, true);
      instruction = params.paymentTask === 'minChange'
        ? '指定された金額を支払うとき、おつりの枚数が最も少なくなるように硬貨・紙幣に〇をつけましょう。'
        : '指定された金額ちょうどになるように、硬貨・紙幣に〇をつけましょう。';
      answerInstruction = '【解答】支払いに使用する硬貨（赤丸）および紙幣（赤枠）';
      break;
    }

    case 'shopping': {
      const data = generateShoppingData(ctx, params);
      problemSvg = renderShopping(data, body.widthMm, body.heightMm, strokeScale, textScale, false);
      answerSvg = renderShopping(data, body.widthMm, body.heightMm, strokeScale, textScale, true);
      instruction = data.level === 'budget'
        ? '上の価格表を見て、予算内で合計金額が最も高くなるように商品を選びましょう。'
        : '上の価格表を見て、買い物リストの合計金額とおつりを計算しましょう。';
      answerInstruction = '【解答】計算式および正答';
      break;
    }
  }

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction,
  };

  const answerPage: PageBody = {
    pageRole: 'answer',
    kind: 'svg',
    markup: answerSvg,
    instruction: answerInstruction,
    subLabel: '【解答・採点シート（検者用）】',
  };

  return {
    pages: [problemPage, answerPage],
  };
}
