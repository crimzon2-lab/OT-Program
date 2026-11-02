/**
 * M01 抹消課題 SVG 描画
 * ARCHITECTURE.md §6, §8, §9 準拠
 */

import { answerCircle, formatQuadrantSummary } from '../../../print/answerParts';
import {
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M01Params,
  type PageBody,
  type SymbolDef,
} from '../../../types/schema';
import { type Rect } from '../../../utils/geometry';
import { esc, fmt } from '../../../utils/html';
import type { M01ProblemData } from './logic';

/**
 * 刺激（文字または記号）を 1 件描画する SVG 断片を生成する。
 * 中心 (x, y) に完璧に揃えて描画する。
 */
function renderStimulus(
  val: string | SymbolDef,
  x: number,
  y: number,
  charSize: number,
  strokeScale: number,
): string {
  if (typeof val === 'string') {
    return `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(charSize)}" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${esc(val)}</text>`;
  }

  const scale = charSize / 10;
  const targetStrokeMm = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const strokeWInGroup = targetStrokeMm / scale;
  const pathAttrs = val.filled
    ? `fill="#000000" stroke="none"`
    : `fill="none" stroke="#000000" stroke-width="${fmt(strokeWInGroup)}" stroke-linecap="round" stroke-linejoin="round"`;

  return [
    `<g transform="translate(${fmt(x)}, ${fmt(y)}) scale(${fmt(scale)}) translate(-5, -5)">`,
    `  <path d="${val.path}" ${pathAttrs} />`,
    `</g>`,
  ].join('');
}

/**
 * 見本帯枠（本文上部）を描画する。
 */
function renderSampleBand(
  data: M01ProblemData,
  bodyW: number,
  strokeScale: number,
): string {
  if (data.sampleHeight <= 0) return '';

  const rectW = bodyW - 6;
  const rectH = data.sampleHeight - 4;
  const cy = data.sampleHeight / 2;
  const startX = 42;
  const gap = Math.max(16, data.drawCharSize + 12);

  const targetElements: string[] = [];
  data.targets.forEach((t, i) => {
    const cx = startX + i * gap;
    targetElements.push(renderStimulus(t, cx, cy, data.drawCharSize, strokeScale));
  });

  return [
    `<g class="target-sample-band">`,
    `  <rect x="3" y="2" width="${fmt(rectW)}" height="${fmt(rectH)}" rx="1.5" fill="#f8f8f8" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.3" stroke-dasharray="2 2" />`,
    `  <text x="6" y="${fmt(cy)}" dominant-baseline="central" font-size="3.5" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">見本（探すもの）：</text>`,
    `  ${targetElements.join('\n  ')}`,
    `</g>`,
  ].join('\n');
}

/**
 * 配置領域に対する4象限ガイド境界線（灰色破線＋象限名ラベル）を描画する。
 */
function renderQuadrantGuidesForArea(area: Rect): string {
  const midX = area.x + area.w / 2;
  const midY = area.y + area.h / 2;
  const stroke = TYPOGRAPHY.subInkColor;
  const fontSize = 2.5;

  return [
    `<g class="quadrant-guides">`,
    `  <line x1="${fmt(midX)}" y1="${fmt(area.y)}" x2="${fmt(midX)}" y2="${fmt(area.y + area.h)}" stroke="${stroke}" stroke-width="0.2" stroke-dasharray="2 2" />`,
    `  <line x1="${fmt(area.x)}" y1="${fmt(midY)}" x2="${fmt(area.x + area.w)}" y2="${fmt(midY)}" stroke="${stroke}" stroke-width="0.2" stroke-dasharray="2 2" />`,
    `  <text x="${fmt(area.x + 3)}" y="${fmt(area.y + 4)}" font-size="${fmt(fontSize)}" fill="${stroke}" font-family="${TYPOGRAPHY.fontFamily}">左上</text>`,
    `  <text x="${fmt(area.x + area.w - 3)}" y="${fmt(area.y + 4)}" font-size="${fmt(fontSize)}" text-anchor="end" fill="${stroke}" font-family="${TYPOGRAPHY.fontFamily}">右上</text>`,
    `  <text x="${fmt(area.x + 3)}" y="${fmt(area.y + area.h - 2)}" font-size="${fmt(fontSize)}" fill="${stroke}" font-family="${TYPOGRAPHY.fontFamily}">左下</text>`,
    `  <text x="${fmt(area.x + area.w - 3)}" y="${fmt(area.y + area.h - 2)}" font-size="${fmt(fontSize)}" text-anchor="end" fill="${stroke}" font-family="${TYPOGRAPHY.fontFamily}">右下</text>`,
    `</g>`,
  ].join('\n');
}

/**
 * M01（抹消課題）の用紙 SVG と結果オブジェクトを生成する。
 */
export function renderM01(
  ctx: GenerateContext,
  params: M01Params & CommonParams,
  data: M01ProblemData,
): GenerateResult {
  const strokeScale = params.strokeScale ?? 100;
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;

  const targetNames = data.targets
    .map((t) => (typeof t === 'string' ? `「${t}」` : `「[[sym:${t.id}]]」`))
    .join('、');

  // 問題用紙の教示文
  const problemInstruction = params.showTargetSample
    ? `この中から、見本と同じ${targetNames}をすべて見つけて〇をつけてください。`
    : `この中から、${targetNames}をすべて見つけて〇をつけてください。`;

  // 解答用紙の教示文（ターゲット一覧＋4象限集計）
  const answerInstruction = [
    `【抹消ターゲット：${targetNames}】`,
    formatQuadrantSummary(data.quadrantStats),
  ].join('\n');

  // 見本帯 SVG
  const sampleBandSvg = renderSampleBand(data, bodyW, strokeScale);

  // 全刺激 SVG
  const stimuliSvg = data.items
    .map((item) =>
      renderStimulus(item.value, item.x, item.y, data.drawCharSize, strokeScale),
    )
    .join('\n  ');

  // 解答用ハイライト（ターゲット外周の赤太丸）
  const highlightsSvg = data.items
    .filter((item) => item.isTarget)
    .map((item) =>
      answerCircle(item.x, item.y, data.effectiveCharSize, strokeScale),
    )
    .join('\n  ');

  // 象限ガイド
  const quadrantGuidesSvg = renderQuadrantGuidesForArea(data.area);

  // 問題用紙 SVG
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${sampleBandSvg}`,
    `  <g class="stimuli">`,
    `    ${stimuliSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  // 解答用紙 SVG（刺激は黒のまま + 赤丸 + 象限ガイド）
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${sampleBandSvg}`,
    `  <g class="stimuli">`,
    `    ${stimuliSvg}`,
    `  </g>`,
    `  ${quadrantGuidesSvg}`,
    `  <g class="highlights">`,
    `    ${highlightsSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  const problemPage: PageBody = {
    pageRole: 'problem',
    kind: 'svg',
    markup: problemSvg,
    instruction: problemInstruction,
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
    quadrantStats: data.quadrantStats,
  };
}
