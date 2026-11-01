/**
 * SVG 文字列生成ユーティリティ
 * ARCHITECTURE.md §0, §11.2 準拠
 */

import { type BodyBox, TYPOGRAPHY } from '../types/schema';
import { attrs, esc, fmt } from './html';

/**
 * 印刷本文用ルート SVG タグを生成する
 */
export function svgRoot(
  body: BodyBox,
  inner: string,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const extra = extraAttrs && Object.keys(extraAttrs).length > 0 ? ` ${attrs(extraAttrs)}` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(body.widthMm)}mm" height="${fmt(body.heightMm)}mm" viewBox="0 0 ${fmt(body.widthMm)} ${fmt(body.heightMm)}" font-family="${esc(TYPOGRAPHY.fontFamily)}"${extra}>${inner}</svg>`;
}

/**
 * SVG line 要素を生成する
 */
export function svgLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const base = `x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"`;
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<line ${base}${extra ? ` ${extra}` : ''} />`;
}

/**
 * SVG rect 要素を生成する
 */
export function svgRect(
  x: number,
  y: number,
  w: number,
  h: number,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const base = `x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"`;
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<rect ${base}${extra ? ` ${extra}` : ''} />`;
}

/**
 * SVG circle 要素を生成する
 */
export function svgCircle(
  cx: number,
  cy: number,
  r: number,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const base = `cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"`;
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<circle ${base}${extra ? ` ${extra}` : ''} />`;
}

/**
 * SVG text 要素を生成する。テキスト内容は esc() を通す。
 */
export function svgText(
  x: number,
  y: number,
  text: string,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const base = `x="${fmt(x)}" y="${fmt(y)}"`;
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<text ${base}${extra ? ` ${extra}` : ''}>${esc(text)}</text>`;
}

/**
 * SVG path 要素を生成する
 */
export function svgPath(
  d: string,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const base = `d="${esc(d)}"`;
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<path ${base}${extra ? ` ${extra}` : ''} />`;
}

/**
 * SVG g 要素を生成する
 */
export function svgGroup(
  inner: string,
  extraAttrs?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const extra = extraAttrs ? attrs(extraAttrs) : '';
  return `<g${extra ? ` ${extra}` : ''}>${inner}</g>`;
}
