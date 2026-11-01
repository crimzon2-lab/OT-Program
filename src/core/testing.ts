/**
 * テスト用 GenerateContext ヘルパー
 * ARCHITECTURE.md §1, §11.3 準拠
 */

import {
  BODY_BOX,
  type BodyBox,
  type GenerateContext,
  type GenWarning,
  type ModuleId,
  type Orientation,
  type WarningCode,
} from '../types/schema';
import { drawFromPool } from '../utils/pool';
import { createSheetRng } from '../utils/prng';

export interface MakeTestContextOptions {
  readonly moduleId?: ModuleId;
  readonly seed?: number;
  readonly sheetIndex?: number;
  readonly sheetCount?: number;
  readonly orientation?: Orientation;
  readonly seedCode?: string;
}

/**
 * 単体テスト・スモークテスト用の GenerateContext を生成する。
 * 同一 ctx 内での重複 poolKey draw を禁止する本番同様の安全ガードを備える。
 */
export function makeTestContext(opts?: MakeTestContextOptions): {
  ctx: GenerateContext;
  warnings: GenWarning[];
} {
  const moduleId: ModuleId = opts?.moduleId ?? 'M01';
  const seed = opts?.seed ?? 12345;
  const sheetIndex = opts?.sheetIndex ?? 1;
  const sheetCount = opts?.sheetCount ?? 1;
  const orientation: Orientation = opts?.orientation ?? 'portrait';
  const seedCode = opts?.seedCode ?? `RP1-${moduleId}-${seed}`;
  const body: BodyBox = BODY_BOX[orientation];
  const rng = createSheetRng(seed, moduleId, sheetIndex);

  const warnings: GenWarning[] = [];
  const usedPoolKeys = new Set<string>();

  const warn = (code: WarningCode, message: string) => {
    warnings.push({ code, message, sheetIndex });
  };

  const draw = <T>(poolKey: string, items: readonly T[], count: number): T[] => {
    if (usedPoolKeys.has(poolKey)) {
      throw new Error(`poolKey "${poolKey}" has already been drawn in this generate context`);
    }
    usedPoolKeys.add(poolKey);
    return drawFromPool({
      seed,
      moduleId,
      sheetIndex,
      poolKey,
      items,
      count,
      warn,
    });
  };

  const ctx: GenerateContext = {
    moduleId,
    seed,
    sheetIndex,
    sheetCount,
    seedCode,
    rng,
    orientation,
    body,
    draw,
    warn,
  };

  return { ctx, warnings };
}
