/**
 * M10: サブモードA（硬貨・紙幣の合計と支払い選択）
 * ARCHITECTURE.md §5.6 準拠（逆算・一意解保証）
 */

import type { Denomination, GenerateContext, M10Params } from '../../../types/schema';

const ALL_DENOMS_DESC: readonly Denomination[] = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
const COIN_DENOMS_DESC: readonly Denomination[] = [500, 100, 50, 10, 5, 1];

/**
 * 貪欲法による金種内訳の計算（日本の正準通貨系）
 */
export function greedyBreakdown(
  amount: number,
  includeBills = false,
): Map<Denomination, number> {
  const denoms = includeBills ? ALL_DENOMS_DESC : COIN_DENOMS_DESC;
  const result = new Map<Denomination, number>();
  let rem = Math.max(0, Math.floor(amount));

  for (const d of denoms) {
    if (rem >= d) {
      const count = Math.floor(rem / d);
      result.set(d, count);
      rem -= count * d;
    }
  }
  return result;
}

/**
 * 貪欲法による枚数合計の計算
 */
export function countGreedyCoins(amount: number, includeBills = false): number {
  const breakdown = greedyBreakdown(amount, includeBills);
  let total = 0;
  for (const count of breakdown.values()) {
    total += count;
  }
  return total;
}

export interface CoinTotalProblem {
  readonly id: number;
  readonly items: readonly Denomination[];
  readonly totalAmount: number;
  readonly breakdown: readonly { denom: Denomination; count: number }[];
}

export interface PaymentProblemItem {
  readonly id: number;
  readonly denom: Denomination;
}

export interface PaymentProblem {
  readonly id: number;
  readonly price: number;
  readonly wallet: readonly PaymentProblemItem[];
  readonly selectedIds: readonly number[];
  readonly changeAmount: number;
  readonly changeCoinsCount: number;
}

/**
 * サブモード coinTotal の問題群を生成
 */
export function generateCoinTotalProblems(
  ctx: GenerateContext,
  params: M10Params,
): readonly CoinTotalProblem[] {
  const count = Math.max(2, Math.min(6, params.problemCount));
  const maxPieces = Math.max(3, Math.min(12, params.maxPieces));
  const includeBills = params.includeBills;

  // 使用可能な金種
  const availableCoins: readonly Denomination[] = [1, 5, 10, 50, 100, 500];
  const availableBills: readonly Denomination[] = [1000]; // 1000円札を中心に使用

  const usedTotals = new Set<number>();
  const problems: CoinTotalProblem[] = [];

  for (let q = 1; q <= count; q++) {
    let bestItems: Denomination[] = [];
    let bestTotal = 0;

    for (let attempt = 0; attempt < 30; attempt++) {
      const pieceCount = ctx.rng.int(3, maxPieces);
      const items: Denomination[] = [];

      for (let p = 0; p < pieceCount; p++) {
        if (includeBills && ctx.rng.chance(0.2)) {
          items.push(ctx.rng.pick(availableBills));
        } else {
          items.push(ctx.rng.pick(availableCoins));
        }
      }

      const total = items.reduce((sum, d) => sum + d, 0);
      if (!usedTotals.has(total) || attempt === 29) {
        bestItems = items;
        bestTotal = total;
        usedTotals.add(total);
        break;
      }
    }

    // 金額の大きい順にソート
    bestItems.sort((a, b) => b - a);

    // 金種別内訳
    const breakdownMap = new Map<Denomination, number>();
    for (const d of bestItems) {
      breakdownMap.set(d, (breakdownMap.get(d) ?? 0) + 1);
    }
    const breakdown: { denom: Denomination; count: number }[] = [];
    for (const d of ALL_DENOMS_DESC) {
      const cnt = breakdownMap.get(d);
      if (cnt !== undefined && cnt > 0) {
        breakdown.push({ denom: d, count: cnt });
      }
    }

    problems.push({
      id: q,
      items: bestItems,
      totalAmount: bestTotal,
      breakdown,
    });
  }

  return problems;
}

/**
 * サブモード payment（支払い選択）の1問を生成（一意解検証つき）
 */
function generateSinglePaymentProblem(
  ctx: GenerateContext,
  id: number,
  params: M10Params,
): PaymentProblem {
  const isExact = params.paymentTask === 'exact';
  const includeBills = params.includeBills;
  const priceMax = Math.min(params.priceMax, includeBills ? 10000 : 1500);

  // 利用可能な金種
  const denoms: Denomination[] = includeBills
    ? [1000, 500, 100, 50, 10, 5, 1]
    : [500, 100, 50, 10, 5, 1];

  let bestProblem: PaymentProblem | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    // 支払額 price を決定（10の倍数または1円単位）
    let price: number;
    if (includeBills && priceMax >= 500) {
      price = ctx.rng.int(2, Math.floor(priceMax / 50)) * 50;
    } else {
      price = ctx.rng.int(2, Math.floor(priceMax / 10)) * 10;
    }
    if (price <= 0) price = 100;

    // price を構成する基本金種セット（貪欲法などで作成）
    const exactMap = greedyBreakdown(price, includeBills);
    const exactList: Denomination[] = [];
    for (const [d, count] of exactMap.entries()) {
      for (let i = 0; i < count; i++) {
        exactList.push(d);
      }
    }

    // ダミーの硬貨・紙幣を 2〜4 枚追加して手持ち財布を作る
    const dummyCount = ctx.rng.int(2, 4);
    const walletDenoms: Denomination[] = [...exactList];

    for (let i = 0; i < dummyCount; i++) {
      // 既存の金種と重なりすぎないよう適当に追加
      const d = ctx.rng.pick(denoms);
      walletDenoms.push(d);
    }

    // 合計枚数が多すぎる場合は切り詰め（2^N <= 4096 -> N <= 12）
    if (walletDenoms.length > 12) {
      walletDenoms.length = 12;
    }

    // シャッフルしてアイテム化
    const shuffled = ctx.rng.shuffle(walletDenoms);
    const wallet: PaymentProblemItem[] = shuffled.map((denom, idx) => ({
      id: idx + 1,
      denom,
    }));

    const N = wallet.length;
    const totalSubsets = 1 << N;

    if (isExact) {
      // 合計が price になるマスクを全探索
      const matchingMasks: number[] = [];
      for (let mask = 1; mask < totalSubsets; mask++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            sum += wallet[i]!.denom;
          }
        }
        if (sum === price) {
          matchingMasks.push(mask);
        }
      }

      if (matchingMasks.length === 1) {
        const mask = matchingMasks[0]!;
        const selectedIds: number[] = [];
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            selectedIds.push(wallet[i]!.id);
          }
        }
        return {
          id,
          price,
          wallet,
          selectedIds,
          changeAmount: 0,
          changeCoinsCount: 0,
        };
      }

      if (matchingMasks.length > 0 && !bestProblem) {
        const mask = matchingMasks[0]!;
        const selectedIds: number[] = [];
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            selectedIds.push(wallet[i]!.id);
          }
        }
        bestProblem = {
          id,
          price,
          wallet,
          selectedIds,
          changeAmount: 0,
          changeCoinsCount: 0,
        };
      }
    } else {
      // minChange: 合計 >= price の全マスクを探索し、(おつり枚数, 支払枚数) が辞書式最小のものを評価
      let minCoins = Infinity;
      let minPayCount = Infinity;
      let minMasks: number[] = [];

      for (let mask = 1; mask < totalSubsets; mask++) {
        let sum = 0;
        let payCount = 0;
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            sum += wallet[i]!.denom;
            payCount++;
          }
        }
        if (sum >= price) {
          const change = sum - price;
          const coins = countGreedyCoins(change, false); // おつりは硬貨で返る
          if (coins < minCoins || (coins === minCoins && payCount < minPayCount)) {
            minCoins = coins;
            minPayCount = payCount;
            minMasks = [mask];
          } else if (coins === minCoins && payCount === minPayCount) {
            minMasks.push(mask);
          }
        }
      }

      if (minMasks.length === 1) {
        const mask = minMasks[0]!;
        const selectedIds: number[] = [];
        let paySum = 0;
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            selectedIds.push(wallet[i]!.id);
            paySum += wallet[i]!.denom;
          }
        }
        return {
          id,
          price,
          wallet,
          selectedIds,
          changeAmount: paySum - price,
          changeCoinsCount: minCoins,
        };
      }

      if (minMasks.length > 0 && !bestProblem) {
        const mask = minMasks[0]!;
        const selectedIds: number[] = [];
        let paySum = 0;
        for (let i = 0; i < N; i++) {
          if ((mask & (1 << i)) !== 0) {
            selectedIds.push(wallet[i]!.id);
            paySum += wallet[i]!.denom;
          }
        }
        bestProblem = {
          id,
          price,
          wallet,
          selectedIds,
          changeAmount: paySum - price,
          changeCoinsCount: minCoins,
        };
      }
    }
  }

  // 50回試行しても一意にならなかった場合のフォールバック
  if (bestProblem) {
    return bestProblem;
  }

  // 万一の最小フォールバック
  return {
    id,
    price: 100,
    wallet: [{ id: 1, denom: 100 }, { id: 2, denom: 50 }, { id: 3, denom: 10 }],
    selectedIds: [1],
    changeAmount: 0,
    changeCoinsCount: 0,
  };
}

/**
 * サブモード payment の全問題群を生成
 */
export function generatePaymentProblems(
  ctx: GenerateContext,
  params: M10Params,
): readonly PaymentProblem[] {
  let count = Math.max(2, Math.min(6, params.problemCount));
  if (count > 4) {
    ctx.warn('ITEMS_REDUCED', '支払い問題は紙面レイアウトのため最大4問に制限されます');
    count = 4;
  }

  const problems: PaymentProblem[] = [];
  for (let q = 1; q <= count; q++) {
    problems.push(generateSinglePaymentProblem(ctx, q, params));
  }
  return problems;
}
