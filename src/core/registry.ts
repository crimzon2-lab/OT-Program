/**
 * モジュールレジストリ
 * ARCHITECTURE.md §1 準拠
 */

import { m01Module } from '../modules/attention/m01-cancellation';
import { m02Module } from '../modules/attention/m02-tmt';
import { m03Module } from '../modules/attention/m03-symbol-digit';
import { m04Module } from '../modules/attention/m04-kana-pickup';
import { m07Module } from '../modules/memory/m07-serial-nback';
import { m05Module } from '../modules/visuospatial/m05-lines';
import { m06Module } from '../modules/visuospatial/m06-dots-matrix';
import type { AnyTaskModule, DomainId, ModuleId } from '../types/schema';

/**
 * 本番用全モジュール一覧（Phase 1〜4 で順次登録される）
 */
export const ALL_MODULES: readonly AnyTaskModule[] = [
  m01Module,
  m02Module,
  m03Module,
  m04Module,
  m05Module,
  m06Module,
  m07Module,
];

const testModules = new Map<ModuleId, AnyTaskModule>();

/**
 * モジュール ID から該当モジュールを取得する（テスト登録モジュールを優先）
 */
export function getModule(id: ModuleId): AnyTaskModule | undefined {
  return testModules.get(id) ?? ALL_MODULES.find((m) => m.id === id);
}

/**
 * 領域 ID からモジュール一覧を取得する
 */
export function getModulesByDomain(domain: DomainId): readonly AnyTaskModule[] {
  const list = [...ALL_MODULES];
  for (const tm of testModules.values()) {
    if (!list.some((m) => m.id === tm.id)) {
      list.push(tm);
    }
  }
  return list.filter((m) => m.domain === domain);
}

/**
 * テスト用モックモジュールを登録する。
 * 解除用の関数を返す（テスト間汚染防止）。
 */
export function registerModuleForTest(module: AnyTaskModule): () => void {
  testModules.set(module.id, module);
  return () => {
    testModules.delete(module.id);
  };
}

/**
 * テスト登録されたモックモジュールをすべて解除する（テスト間汚染防止）
 */
export function resetRegistryForTest(): void {
  testModules.clear();
}
