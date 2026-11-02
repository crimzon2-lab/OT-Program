/**
 * M10: サブモードB（買い物リストと予算・割引・お釣り計算）
 * ARCHITECTURE.md §5.6, §9.4, §10 準拠（逆算・整数保証・一意性保証）
 */

import { SHOP_ITEMS } from '../../../data/shop-items';
import type { GenerateContext, M10Params, ShopItem } from '../../../types/schema';

export type ShoppingDiscountType = 'none' | '10percent' | 'half';

export interface ShoppingListItem {
  readonly item: ShopItem;
  readonly quantity: number;
  readonly discount: ShoppingDiscountType;
  readonly unitPrice: number;
  readonly subtotal: number;
}

export interface ShoppingData {
  readonly level: 'basic' | 'discount' | 'budget';
  readonly priceTable: readonly ShopItem[];
  // basic & discount 用
  readonly shoppingList: readonly ShoppingListItem[];
  readonly totalAmount: number;
  readonly walletAmount: number;
  readonly changeAmount: number;
  // budget 用
  readonly candidateItems: readonly ShopItem[];
  readonly budgetAmount: number;
  readonly bestCombinationIds: readonly string[];
  readonly bestTotalAmount: number;
  readonly bestRemainingBudget: number;
}

/**
 * 所持金をキリの良い金額（500円または1000円単位）で逆算設定する
 */
function calculateWalletAmount(total: number): number {
  if (total <= 400) return 500;
  if (total <= 800) return 1000;
  if (total <= 1300) return 1500;
  if (total <= 1800) return 2000;
  if (total <= 2700) return 3000;
  return Math.ceil((total + 200) / 1000) * 1000;
}

/**
 * 買い物計算データを生成する主ロジック
 */
export function generateShoppingData(
  ctx: GenerateContext,
  params: M10Params,
): ShoppingData {
  const shopItemCount = Math.max(8, Math.min(15, params.shopItemCount));
  const listCount = Math.max(2, Math.min(6, params.listCount));
  const level = params.shoppingLevel;
  const includeQuantity = params.includeQuantity;

  // 価格表の品目をプールから非復元抽出
  const priceTable = ctx.draw<ShopItem>('m10-shop-items', SHOP_ITEMS, shopItemCount);

  if (level === 'budget') {
    // budget: 候補品目（5品）から予算以内で合計が最大となる組み合わせが一意になるよう逆算
    let bestCandidateItems: ShopItem[] = [];
    let bestBudget = 0;
    let bestCombinationIds: string[] = [];
    let bestTotal = 0;

    for (let attempt = 0; attempt < 30; attempt++) {
      const candidates = ctx.rng.sample(priceTable, Math.min(5, priceTable.length));
      const N = candidates.length;
      const totalSubsets = 1 << N;

      // 各部分集合の合計金額を集計（空集合を除く）
      const subsetSums: { mask: number; sum: number }[] = [];
      for (let mask = 1; mask < totalSubsets; mask++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            sum += candidates[i]!.price;
          }
        }
        subsetSums.push({ mask, sum });
      }

      // 金額で降順ソート
      subsetSums.sort((a, b) => b.sum - a.sum);

      // 上位の金額から、一意の最大値となるマスクと予算を探す
      // ちょうど3〜4品選んだ合計などをターゲットにする
      for (let i = 0; i < subsetSums.length; i++) {
        const target = subsetSums[i]!;
        // 同額の部分集合がないか確認
        const sameSumCount = subsetSums.filter((s) => s.sum === target.sum).length;
        if (sameSumCount === 1) {
          // 予算 B を target.sum と設定
          // target.sum 以下の部分集合の中で、target.sum が真の唯一最大
          bestCandidateItems = candidates;
          bestBudget = target.sum;
          bestTotal = target.sum;

          const ids: string[] = [];
          for (let b = 0; b < N; b++) {
            if ((target.mask & (1 << b)) !== 0) {
              ids.push(candidates[b]!.id);
            }
          }
          bestCombinationIds = ids;
          break;
        }
      }

      if (bestCombinationIds.length >= 2) {
        break;
      }
    }

    return {
      level: 'budget',
      priceTable,
      shoppingList: [],
      totalAmount: 0,
      walletAmount: 0,
      changeAmount: 0,
      candidateItems: bestCandidateItems,
      budgetAmount: bestBudget,
      bestCombinationIds,
      bestTotalAmount: bestTotal,
      bestRemainingBudget: bestBudget - bestTotal,
    };
  }

  // basic または discount
  const chosenItems = ctx.rng.sample(priceTable, Math.min(listCount, priceTable.length));
  const shoppingList: ShoppingListItem[] = [];

  // 割引を付与する品目インデックス（discount の場合のみ 1〜2品）
  const discountIndices = new Set<number>();
  if (level === 'discount') {
    const indices = chosenItems.map((_, i) => i);
    const shuffledIndices = ctx.rng.shuffle(indices);
    for (const idx of shuffledIndices) {
      if (discountIndices.size >= 2) break;
      const item = chosenItems[idx]!;
      // 10の倍数なら10%引き、偶数なら半額が可能
      if (item.price % 10 === 0 || item.price % 2 === 0) {
        discountIndices.add(idx);
      }
    }
  }

  // 個数指定（2〜3個）を付与するインデックス（includeQuantity の場合のみ 1〜2品）
  const quantityIndices = new Set<number>();
  if (includeQuantity) {
    const countableIndices = chosenItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.countable)
      .map(({ idx }) => idx);

    const shuffledCountable = ctx.rng.shuffle(countableIndices);
    for (let i = 0; i < Math.min(2, shuffledCountable.length); i++) {
      quantityIndices.add(shuffledCountable[i]!);
    }
  }

  let totalAmount = 0;

  for (let i = 0; i < chosenItems.length; i++) {
    const item = chosenItems[i]!;
    let quantity = 1;
    if (quantityIndices.has(i)) {
      quantity = ctx.rng.int(2, 3);
    }

    let discount: ShoppingDiscountType = 'none';
    let unitPrice = item.price;

    if (discountIndices.has(i)) {
      // 10の倍数なら10%引きを優先、そうでなければ半額
      if (item.price % 10 === 0 && ctx.rng.chance(0.5)) {
        discount = '10percent';
        unitPrice = Math.round(item.price * 0.9);
      } else if (item.price % 2 === 0) {
        discount = 'half';
        unitPrice = item.price / 2;
      } else if (item.price % 10 === 0) {
        discount = '10percent';
        unitPrice = Math.round(item.price * 0.9);
      }
    }

    const subtotal = unitPrice * quantity;
    totalAmount += subtotal;

    shoppingList.push({
      item,
      quantity,
      discount,
      unitPrice,
      subtotal,
    });
  }

  const walletAmount = calculateWalletAmount(totalAmount);
  const changeAmount = walletAmount - totalAmount;

  return {
    level,
    priceTable,
    shoppingList,
    totalAmount,
    walletAmount,
    changeAmount,
    candidateItems: [],
    budgetAmount: 0,
    bestCombinationIds: [],
    bestTotalAmount: 0,
    bestRemainingBudget: 0,
  };
}
