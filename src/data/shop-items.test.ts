/**
 * 買い物商品マスターデータ 整合性テスト
 * ARCHITECTURE.md §9.4, §10 準拠
 */

import { describe, expect, it } from 'vitest';
import type { ShopCategory } from '../types/schema';
import { SHOP_ITEMS } from './shop-items';

describe('SHOP_ITEMS 買い物マスターデータ', () => {
  const expectedCategories: readonly ShopCategory[] = [
    'vegetable',
    'fruit',
    'meat',
    'fish',
    'dairy',
    'bread',
    'staple',
    'drink',
    'snack',
    'seasoning',
    'frozen',
    'daily',
  ];

  it('総数が72品目以上であること', () => {
    expect(SHOP_ITEMS.length).toBeGreaterThanOrEqual(72);
  });

  it('ID が一意であり、shop-XXX の連番形式であること', () => {
    const idSet = new Set<string>();
    SHOP_ITEMS.forEach((item, index) => {
      expect(idSet.has(item.id)).toBe(false);
      idSet.add(item.id);

      const expectedId = `shop-${String(index + 1).padStart(3, '0')}`;
      expect(item.id).toBe(expectedId);
    });
  });

  it('品名が一意であること', () => {
    const nameSet = new Set<string>();
    for (const item of SHOP_ITEMS) {
      expect(nameSet.has(item.name)).toBe(false);
      nameSet.add(item.name);
    }
  });

  it('全12カテゴリがすべて収録され、各カテゴリ6品目以上あること', () => {
    const counts = new Map<ShopCategory, number>();
    for (const item of SHOP_ITEMS) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }

    for (const cat of expectedCategories) {
      const count = counts.get(cat) ?? 0;
      expect(count).toBeGreaterThanOrEqual(6);
    }
    expect(counts.size).toBe(12);
  });

  it('価格が 10..1500 円の整数であること', () => {
    for (const item of SHOP_ITEMS) {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThanOrEqual(10);
      expect(item.price).toBeLessThanOrEqual(1500);
    }
  });

  it('10の倍数価格が30%以上（24品目以上）収録されていること', () => {
    const count = SHOP_ITEMS.filter((item) => item.price % 10 === 0).length;
    const ratio = count / SHOP_ITEMS.length;
    expect(count).toBeGreaterThanOrEqual(24);
    expect(ratio).toBeGreaterThanOrEqual(0.3);
  });

  it('偶数価格が50%以上（36品目以上）収録されていること', () => {
    const count = SHOP_ITEMS.filter((item) => item.price % 2 === 0).length;
    const ratio = count / SHOP_ITEMS.length;
    expect(count).toBeGreaterThanOrEqual(36);
    expect(ratio).toBeGreaterThanOrEqual(0.5);
  });

  it('countable: true の品目が40品目以上収録されていること', () => {
    const count = SHOP_ITEMS.filter((item) => item.countable).length;
    expect(count).toBeGreaterThanOrEqual(40);
  });
});
