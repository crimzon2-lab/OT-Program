/**
 * M10: 硬貨・紙幣 白黒ハイコントラスト模式図 SVG ビルダ
 * ARCHITECTURE.md §9, §11.2 準拠
 */

import {
  BILL_DRAW_SCALE,
  BILL_SPECS,
  COIN_SPECS,
  TYPOGRAPHY,
  type Denomination,
} from '../../../types/schema';
import { fmt } from '../../../utils/html';

export interface MoneySvgResult {
  readonly svg: string;
  readonly widthMm: number;
  readonly heightMm: number;
}

/**
 * 1つの硬貨または紙幣の模式図 SVG を描画する
 * @param denom 金種 (1, 5, 10, 50, 100, 500, 1000, 5000, 10000)
 * @param cx 中心の X 座標 (mm)
 * @param cy 中心の Y 座標 (mm)
 * @param scale 拡大倍率（既定 1）
 * @param strokeScale 線幅倍率（既定 100）
 */
export function renderMoneySvgItem(
  denom: Denomination,
  cx: number,
  cy: number,
  scale = 1,
  strokeScale = 100,
): MoneySvgResult {
  const baseStroke = (TYPOGRAPHY.baseStrokeMm * strokeScale) / 100;
  const ink = TYPOGRAPHY.inkColor;
  const font = TYPOGRAPHY.fontFamily;

  if (denom <= 500) {
    // 硬貨
    const coinSpec = COIN_SPECS[denom as 1 | 5 | 10 | 50 | 100 | 500];
    const diameter = coinSpec.diameterMm * scale;
    const r = diameter / 2;
    const elements: string[] = [];

    switch (denom) {
      case 1:
        // 1円: 白塗り・細黒縁・中央に太字「1」＋下に「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.15)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.9)}" font-weight="bold" font-family="${font}" fill="${ink}">1</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.55)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;

      case 5:
        // 5円: 淡灰塗り（#D9D9D9）・黒縁・中央穴（直径5mm）・穴の上「5」・穴の下「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#D9D9D9" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(2.5 * scale)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.8)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.5)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.55)}" font-weight="bold" font-family="${font}" fill="${ink}">5</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.62)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;

      case 10:
        // 10円: 灰塗り（#BFBFBF）・黒縁・中央に太字「10」＋「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#BFBFBF" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.15)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.78)}" font-weight="bold" font-family="${font}" fill="${ink}">10</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.55)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;

      case 50:
        // 50円: 白塗り・二重黒縁・中央穴（直径4mm）・穴の上「50」・穴の下「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r - 0.9 * scale)}" fill="none" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.7)}" />`,
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(2.0 * scale)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.8)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.5)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.48)}" font-weight="bold" font-family="${font}" fill="${ink}">50</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.62)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;

      case 100:
        // 100円: 白塗り・二重黒縁・中央に太字「100」＋「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke)}" />`,
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r - 0.9 * scale)}" fill="none" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.7)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.15)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.68)}" font-weight="bold" font-family="${font}" fill="${ink}">100</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.55)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;

      case 500:
        // 500円: 淡灰塗り（#D9D9D9）・太い外周＋二重縁・中央に大きな太字「500」＋「円」
        elements.push(
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="#D9D9D9" stroke="${ink}" stroke-width="${fmt(baseStroke * 2.2)}" />`,
          `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r - 1.2 * scale)}" fill="none" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.8)}" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - r * 0.15)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.72)}" font-weight="bold" font-family="${font}" fill="${ink}">500</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + r * 0.55)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(r * 0.35)}" font-family="${font}" fill="${ink}">円</text>`,
        );
        break;
    }

    return {
      svg: elements.join('\n'),
      widthMm: diameter,
      heightMm: diameter,
    };
  } else {
    // 紙幣
    const billSpec = BILL_SPECS[denom as 1000 | 5000 | 10000];
    const widthMm = billSpec.widthMm * BILL_DRAW_SCALE * scale;
    const heightMm = billSpec.heightMm * BILL_DRAW_SCALE * scale;
    const x = cx - widthMm / 2;
    const y = cy - heightMm / 2;
    const elements: string[] = [];

    switch (denom) {
      case 1000:
        // 1000円: 白塗り・一重黒枠・中央に太字「1000」・下部に「千円」
        elements.push(
          `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(widthMm)}" height="${fmt(heightMm)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.6" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - heightMm * 0.08)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.38)}" font-weight="bold" font-family="${font}" fill="${ink}">1000</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + heightMm * 0.32)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.22)}" font-family="${font}" fill="${ink}">千円</text>`,
        );
        break;

      case 5000:
        // 5000円: 白塗り・二重黒枠・中央に太字「5000」・下部に「五千円」
        elements.push(
          `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(widthMm)}" height="${fmt(heightMm)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke)}" rx="0.6" />`,
          `<rect x="${fmt(x + 1.2 * scale)}" y="${fmt(y + 1.2 * scale)}" width="${fmt(widthMm - 2.4 * scale)}" height="${fmt(heightMm - 2.4 * scale)}" fill="none" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.7)}" rx="0.4" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - heightMm * 0.08)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.38)}" font-weight="bold" font-family="${font}" fill="${ink}">5000</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + heightMm * 0.32)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.22)}" font-family="${font}" fill="${ink}">五千円</text>`,
        );
        break;

      case 10000:
        // 10000円: 白塗り・太い二重黒枠・中央に太字「10000」・下部に「一万円」
        elements.push(
          `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(widthMm)}" height="${fmt(heightMm)}" fill="#ffffff" stroke="${ink}" stroke-width="${fmt(baseStroke * 2.0)}" rx="0.6" />`,
          `<rect x="${fmt(x + 1.4 * scale)}" y="${fmt(y + 1.4 * scale)}" width="${fmt(widthMm - 2.8 * scale)}" height="${fmt(heightMm - 2.8 * scale)}" fill="none" stroke="${ink}" stroke-width="${fmt(baseStroke * 0.9)}" rx="0.4" />`,
          `<text x="${fmt(cx)}" y="${fmt(cy - heightMm * 0.08)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.35)}" font-weight="bold" font-family="${font}" fill="${ink}">10000</text>`,
          `<text x="${fmt(cx)}" y="${fmt(cy + heightMm * 0.32)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(heightMm * 0.22)}" font-family="${font}" fill="${ink}">一万円</text>`,
        );
        break;
    }

    return {
      svg: elements.join('\n'),
      widthMm,
      heightMm,
    };
  }
}
