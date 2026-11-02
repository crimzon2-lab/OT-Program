/**
 * M10: 硬貨・紙幣模式図 単体テスト
 * ARCHITECTURE.md §9, §11.2 準拠
 */

import { describe, expect, it } from 'vitest';
import {
  BILL_DRAW_SCALE,
  BILL_SPECS,
  COIN_SPECS,
  DENOMINATIONS,
} from '../../../types/schema';
import { renderMoneySvgItem } from './coins';

describe('M10 renderMoneySvgItem', () => {
  it('全9金種で有効な SVG と寸法が返ること', () => {
    for (const denom of DENOMINATIONS) {
      const res = renderMoneySvgItem(denom, 50, 50);
      expect(res.svg).toContain('<text');
      expect(res.svg).toContain(String(denom));

      if (denom <= 500) {
        const spec = COIN_SPECS[denom as 1 | 5 | 10 | 50 | 100 | 500];
        expect(res.widthMm).toBeCloseTo(spec.diameterMm, 1);
        expect(res.heightMm).toBeCloseTo(spec.diameterMm, 1);
        expect(res.svg).toContain('<circle');
      } else {
        const spec = BILL_SPECS[denom as 1000 | 5000 | 10000];
        expect(res.widthMm).toBeCloseTo(spec.widthMm * BILL_DRAW_SCALE, 1);
        expect(res.heightMm).toBeCloseTo(spec.heightMm * BILL_DRAW_SCALE, 1);
        expect(res.svg).toContain('<rect');
      }
    }
  });

  it('5円と50円に中央丸穴要素が含まれていること', () => {
    const res5 = renderMoneySvgItem(5, 20, 20);
    // 5円には外円と穴円の2つ以上の circle が存在
    const circleMatches5 = res5.svg.match(/<circle /g);
    expect(circleMatches5).not.toBeNull();
    expect(circleMatches5!.length).toBeGreaterThanOrEqual(2);

    const res50 = renderMoneySvgItem(50, 20, 20);
    // 50円には外円、二重内円、穴円の3つの circle が存在
    const circleMatches50 = res50.svg.match(/<circle /g);
    expect(circleMatches50).not.toBeNull();
    expect(circleMatches50!.length).toBeGreaterThanOrEqual(3);
  });

  it('紙幣に漢字表記（千円・五千円・一万円）が含まれていること', () => {
    const res1000 = renderMoneySvgItem(1000, 30, 30);
    expect(res1000.svg).toContain('千円');

    const res5000 = renderMoneySvgItem(5000, 30, 30);
    expect(res5000.svg).toContain('五千円');

    const res10000 = renderMoneySvgItem(10000, 30, 30);
    expect(res10000.svg).toContain('一万円');
  });

  it('白黒・灰色のトーン区別が仕様通りであること', () => {
    const res10 = renderMoneySvgItem(10, 20, 20);
    expect(res10.svg).toContain('#BFBFBF'); // 10円は灰

    const res5 = renderMoneySvgItem(5, 20, 20);
    expect(res5.svg).toContain('#D9D9D9'); // 5円は淡灰

    const res500 = renderMoneySvgItem(500, 20, 20);
    expect(res500.svg).toContain('#D9D9D9'); // 500円は淡灰
  });
});
