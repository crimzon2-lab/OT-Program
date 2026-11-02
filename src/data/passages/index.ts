/**
 * 読解コーパス統合エントリポイント
 * ARCHITECTURE.md §10 準拠
 */

import type { Passage } from '../../types/schema';
import { PASSAGES_1 } from './passages-1';
import { PASSAGES_2 } from './passages-2';
import { PASSAGES_3 } from './passages-3';

export { PASSAGES_1 } from './passages-1';
export { PASSAGES_2 } from './passages-2';
export { PASSAGES_3 } from './passages-3';

/**
 * 全18編の読解コーパス
 */
export const PASSAGES: readonly Passage[] = [
  ...PASSAGES_1,
  ...PASSAGES_2,
  ...PASSAGES_3,
];
