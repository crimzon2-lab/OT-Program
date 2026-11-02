/**
 * 語彙マスターデータ統合エクスポート
 * ARCHITECTURE.md §10 準拠
 */

import type { VocabEntry } from '../../types/schema';
import { VOCAB_GROUP_1 } from './group1';
import { VOCAB_GROUP_2 } from './group2';
import { VOCAB_GROUP_3 } from './group3';
import { VOCAB_GROUP_4 } from './group4';

export * from './categories';
export { VOCAB_GROUP_1 } from './group1';
export { VOCAB_GROUP_2 } from './group2';
export { VOCAB_GROUP_3 } from './group3';
export { VOCAB_GROUP_4 } from './group4';

/**
 * 全日常語彙マスターデータ（12カテゴリ × 20語以上 = 計240語以上）
 */
export const VOCABULARY: readonly VocabEntry[] = [
  ...VOCAB_GROUP_1,
  ...VOCAB_GROUP_2,
  ...VOCAB_GROUP_3,
  ...VOCAB_GROUP_4,
];
