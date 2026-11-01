/**
 * M02 TMT様課題 SVG 描画
 * ARCHITECTURE.md §6, §8, §9 準拠
 */

import { answerPath } from '../../../print/answerParts';
import {
  TYPOGRAPHY,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M02Params,
  type PageBody,
} from '../../../types/schema';
import { esc, fmt } from '../../../utils/html';
import type { TmtNode, TmtProblemData } from './logic';

/**
 * 1つのノード（白丸＋黒線＋ラベル＋開始/終了表示）を描画する。
 * 各ノードの circle には必ず fill="#ffffff" を指定し、解答経路がノード内を貫通して文字と重なるのを防ぐ。
 */
function renderNode(
  node: TmtNode,
  diameter: number,
  strokeScale: number,
): string {
  const r = diameter / 2;
  const strokeW = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;

  // 2桁や大文字ラベルでも円の内周に接触しないようフォントサイズ比率を適切に設定
  const charLen = Array.from(node.label).length;
  const fontRatio = charLen >= 2 ? 0.38 : 0.48;
  const fontSize = diameter * fontRatio;

  const elements: string[] = [
    `<circle cx="${fmt(node.x)}" cy="${fmt(node.y)}" r="${fmt(r)}" fill="#ffffff" stroke="#000000" stroke-width="${fmt(strokeW)}" />`,
    `<text x="${fmt(node.x)}" y="${fmt(node.y)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(fontSize)}" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">${esc(node.label)}</text>`,
  ];

  // 本課題ノードの「開始」「終了」ラベル
  if (!node.isPractice) {
    if (node.isStart) {
      elements.push(
        `<text x="${fmt(node.x)}" y="${fmt(node.y + r + 3.2)}" text-anchor="middle" dominant-baseline="central" font-size="3" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">開始</text>`,
      );
    } else if (node.isEnd) {
      elements.push(
        `<text x="${fmt(node.x)}" y="${fmt(node.y + r + 3.2)}" text-anchor="middle" dominant-baseline="central" font-size="3" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">終了</text>`,
      );
    }
  }

  return elements.join('\n    ');
}

/**
 * 練習枠（本文上部 38mm）を描画する。
 */
function renderPracticeFrame(
  data: TmtProblemData,
  bodyW: number,
  strokeScale: number,
): string {
  if (data.practiceHeight <= 0 || data.practiceNodes.length === 0) return '';

  const h = data.practiceHeight;
  const p1 = data.practiceNodes[0]!;
  const p2 = data.practiceNodes[1]!;

  // 先頭2ノード（Part A は 1→2、Part B は 1→あ）を結ぶ薄い誘導破線
  const guideLine = `<line x1="${fmt(p1.x)}" y1="${fmt(p1.y)}" x2="${fmt(p2.x)}" y2="${fmt(p2.y)}" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.3" stroke-dasharray="2 2" />`;

  const nodeElements = data.practiceNodes
    .map((node) => renderNode(node, data.practiceDiameter, strokeScale))
    .join('\n    ');

  return [
    `<g class="practice-frame">`,
    `  <rect x="3" y="2" width="${fmt(bodyW - 6)}" height="${fmt(h - 4)}" rx="1.5" fill="#fafafa" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.3" />`,
    `  <text x="8" y="9" font-size="3.5" font-weight="bold" font-family="${TYPOGRAPHY.fontFamily}" fill="#000000">【練習】</text>`,
    `  <line x1="3" y1="${fmt(h)}" x2="${fmt(bodyW - 3)}" y2="${fmt(h)}" stroke="${TYPOGRAPHY.subInkColor}" stroke-width="0.4" stroke-dasharray="2 2" />`,
    `  ${guideLine}`,
    `  ${nodeElements}`,
    `</g>`,
  ].join('\n');
}

/**
 * M02（TMT様課題）の用紙 SVG と結果オブジェクトを生成する。
 */
export function renderM02(
  ctx: GenerateContext,
  params: M02Params & CommonParams,
  data: TmtProblemData,
): GenerateResult {
  const strokeScale = params.strokeScale ?? 100;
  const bodyW = ctx.body.widthMm;
  const bodyH = ctx.body.heightMm;

  // 問題用紙の教示文
  const problemInstruction =
    params.part === 'A'
      ? '「1」から順に、数字を線で結んでください。「開始」から始めて「終了」まで進みます。'
      : '数字とひらがなを交互に「1」→「あ」→「2」→「い」…の順に線で結んでください。「開始」から始めて「終了」まで進みます。';

  // 解答用紙の教示文
  const answerInstruction = `【正解順】\n${data.pathSequence}`;

  // 練習枠 SVG
  const practiceSvg = renderPracticeFrame(data, bodyW, strokeScale);

  // 本課題ノード SVG
  const mainNodesSvg = data.mainNodes
    .map((node) => renderNode(node, data.effectiveDiameter, strokeScale))
    .join('\n    ');

  // 解答用正解経路（赤・破線・太線）
  const pathPoints = data.mainNodes.map((n) => ({ x: n.x, y: n.y }));
  const answerPathSvg = answerPath(pathPoints, strokeScale);

  // 問題用紙 SVG
  const problemSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${practiceSvg}`,
    `  <g class="main-nodes">`,
    `    ${mainNodesSvg}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');

  // 解答用紙 SVG（answerPath をノード円の下層＝DOM上で先に描画）
  const answerSvg = [
    `<svg width="${fmt(bodyW)}mm" height="${fmt(bodyH)}mm" viewBox="0 0 ${fmt(bodyW)} ${fmt(bodyH)}" xmlns="http://www.w3.org/2000/svg">`,
    `  ${practiceSvg}`,
    `  <g class="answer-path">`,
    `    ${answerPathSvg}`,
    `  </g>`,
    `  <g class="main-nodes">`,
    `    ${mainNodesSvg}`,
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
  };
}
