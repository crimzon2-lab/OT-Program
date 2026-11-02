/**
 * M10: 金銭管理・買い物計算 ロジック単体テスト
 * ARCHITECTURE.md §5.6, §11.3 準拠
 */

import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../../../core/testing';
import type { M10Params } from '../../../types/schema';
import { countGreedyCoins, generateCoinTotalProblems, generatePaymentProblems, greedyBreakdown } from './money';
import { renderM10 } from './render';
import { generateShoppingData } from './shopping';

describe('M10 金銭管理・買い物計算ロジック', () => {
  const baseParams: M10Params = {
    subMode: 'coinTotal',
    problemCount: 4,
    maxPieces: 8,
    includeBills: true,
    paymentTask: 'exact',
    priceMax: 2000,
    shopItemCount: 12,
    listCount: 4,
    shoppingLevel: 'basic',
    includeQuantity: true,
  };

  describe('貪欲法計算 (greedyBreakdown, countGreedyCoins)', () => {
    it('日本の通貨系で正しく最小枚数に分解されること', () => {
      // 730円 = 500*1 + 100*2 + 10*3 = 6枚
      const bd = greedyBreakdown(730, false);
      expect(bd.get(500)).toBe(1);
      expect(bd.get(100)).toBe(2);
      expect(bd.get(10)).toBe(3);
      expect(countGreedyCoins(730, false)).toBe(6);

      // 紙幣込み: 2650円 = 1000*2 + 500*1 + 100*1 + 50*1 = 5枚
      const bdBill = greedyBreakdown(2650, true);
      expect(bdBill.get(1000)).toBe(2);
      expect(bdBill.get(500)).toBe(1);
      expect(bdBill.get(100)).toBe(1);
      expect(bdBill.get(50)).toBe(1);
      expect(countGreedyCoins(2650, true)).toBe(5);
    });
  });

  describe('サブモード coinTotal', () => {
    it('合計金額が各金種の和と完全に一致すること', () => {
      const { ctx } = makeTestContext({ seed: 101 });
      const problems = generateCoinTotalProblems(ctx, baseParams);

      expect(problems.length).toBe(4);
      for (const p of problems) {
        const sum = p.items.reduce((acc, d) => acc + d, 0);
        expect(p.totalAmount).toBe(sum);

        // 内訳の合計も一致
        const breakdownSum = p.breakdown.reduce((acc, b) => acc + b.denom * b.count, 0);
        expect(breakdownSum).toBe(sum);
      }
    });

    it('問題間で合計金額が重複しないこと', () => {
      const { ctx } = makeTestContext({ seed: 202 });
      const problems = generateCoinTotalProblems(ctx, { ...baseParams, problemCount: 5 });
      const totalSet = new Set(problems.map((p) => p.totalAmount));
      expect(totalSet.size).toBe(problems.length);
    });
  });

  describe('サブモード payment', () => {
    it('exact: 解答の硬貨・紙幣が財布の部分集合であり、合計が支払額に厳密一致すること', () => {
      const { ctx } = makeTestContext({ seed: 303 });
      const problems = generatePaymentProblems(ctx, { ...baseParams, subMode: 'payment', paymentTask: 'exact' });

      for (const p of problems) {
        expect(p.selectedIds.length).toBeGreaterThan(0);
        const walletMap = new Map(p.wallet.map((w) => [w.id, w.denom]));

        let paySum = 0;
        for (const id of p.selectedIds) {
          expect(walletMap.has(id)).toBe(true);
          paySum += walletMap.get(id)!;
        }

        expect(paySum).toBe(p.price);
        expect(p.changeAmount).toBe(0);
      }
    });

    it('minChange: おつり金額 >= 0 かつおつり枚数が最小であること', () => {
      const { ctx } = makeTestContext({ seed: 404 });
      const problems = generatePaymentProblems(ctx, {
        ...baseParams,
        subMode: 'payment',
        paymentTask: 'minChange',
      });

      for (const p of problems) {
        const walletMap = new Map(p.wallet.map((w) => [w.id, w.denom]));
        let paySum = 0;
        for (const id of p.selectedIds) {
          expect(walletMap.has(id)).toBe(true);
          paySum += walletMap.get(id)!;
        }

        expect(paySum).toBeGreaterThanOrEqual(p.price);
        const expectedChange = paySum - p.price;
        expect(p.changeAmount).toBe(expectedChange);
        expect(p.changeCoinsCount).toBe(countGreedyCoins(expectedChange, false));
      }
    });
  });

  describe('サブモード shopping', () => {
    it('basic: 合計・所持金・おつりがすべて正の整数であり、所持金不足（マイナス）が発生しないこと', () => {
      const { ctx } = makeTestContext({ seed: 505 });
      const data = generateShoppingData(ctx, { ...baseParams, subMode: 'shopping', shoppingLevel: 'basic' });

      expect(data.shoppingList.length).toBe(4);
      expect(data.totalAmount).toBeGreaterThan(0);
      expect(data.walletAmount).toBeGreaterThan(data.totalAmount);
      expect(data.changeAmount).toBe(data.walletAmount - data.totalAmount);
      expect(data.changeAmount).toBeGreaterThan(0);

      for (const item of data.shoppingList) {
        expect(Number.isInteger(item.unitPrice)).toBe(true);
        expect(Number.isInteger(item.subtotal)).toBe(true);
        expect(item.subtotal).toBe(item.unitPrice * item.quantity);
      }
    });

    it('discount: 10%引き・半額計算で小数が一切発生せず端数ゼロの整数であること', () => {
      for (let s = 1; s <= 10; s++) {
        const { ctx } = makeTestContext({ seed: 600 + s });
        const data = generateShoppingData(ctx, {
          ...baseParams,
          subMode: 'shopping',
          shoppingLevel: 'discount',
        });

        expect(data.totalAmount).toBeGreaterThan(0);
        expect(data.walletAmount).toBeGreaterThan(data.totalAmount);
        expect(data.changeAmount).toBeGreaterThan(0);

        for (const item of data.shoppingList) {
          expect(Number.isInteger(item.unitPrice)).toBe(true);
          expect(Number.isInteger(item.subtotal)).toBe(true);

          if (item.discount === '10percent') {
            expect(item.unitPrice).toBe(Math.round(item.item.price * 0.9));
          } else if (item.discount === 'half') {
            expect(item.unitPrice).toBe(item.item.price / 2);
          }
        }
      }
    });

    it('budget: 正解組み合わせの合計が予算以下であり、残予算（おつり）が非負整数であること', () => {
      for (let s = 1; s <= 10; s++) {
        const { ctx } = makeTestContext({ seed: 700 + s });
        const data = generateShoppingData(ctx, {
          ...baseParams,
          subMode: 'shopping',
          shoppingLevel: 'budget',
        });

        expect(data.candidateItems.length).toBeGreaterThanOrEqual(4);
        expect(data.bestCombinationIds.length).toBeGreaterThanOrEqual(1);
        expect(data.budgetAmount).toBeGreaterThanOrEqual(data.bestTotalAmount);
        expect(data.bestRemainingBudget).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(data.budgetAmount)).toBe(true);
        expect(Number.isInteger(data.bestTotalAmount)).toBe(true);
      }
    });
  });

  describe('過密条件（problemCount=6, maxPieces=12, textScale=150）でのSVG配置検証', () => {
    it('coinTotal / payment ともすべての紙幣・硬貨がボディ領域内に収まること', () => {
      const { ctx } = makeTestContext({ seed: 977875 });
      const resTotal = renderM10(ctx, {
        ...baseParams,
        subMode: 'coinTotal',
        problemCount: 6,
        maxPieces: 12,
        includeBills: true,
        textScale: 150,
        strokeScale: 150,
      });
      expect(resTotal.pages.length).toBe(2);
      expect(resTotal.pages[0]!.markup).toContain('<svg');

      const { ctx: ctx2 } = makeTestContext({ seed: 977875 });
      const resPay = renderM10(ctx2, {
        ...baseParams,
        subMode: 'payment',
        problemCount: 6,
        priceMax: 10000,
        includeBills: true,
        textScale: 150,
        strokeScale: 150,
      });
      expect(resPay.pages.length).toBe(2);
      expect(resPay.pages[0]!.markup).toContain('<svg');
    });
  });
});
