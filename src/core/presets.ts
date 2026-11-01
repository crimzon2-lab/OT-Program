/**
 * プリセット保存・呼び出し・削除ストア（PresetStore）
 * ARCHITECTURE.md §7 準拠
 */

import {
  PRESET_STORAGE_KEY,
  type AnswerOrder,
  type ModuleId,
  type OutputMode,
  type ParamValues,
  type Preset,
  type PresetStore,
  type StorageLike,
} from '../types/schema';

/**
 * テストおよび localStorage 利用不可時用のインメモリストレージ
 */
export function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

let idCounter = 0;

/**
 * 非セキュアコンテキスト (file:// 等) でも安全に動作する一意 ID 生成関数
 */
export function generatePresetId(): string {
  idCounter = (idCounter + 1) % 10000;
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffff).toString(36);
  return `p-${time}-${rand}-${idCounter}`;
}

/**
 * プリセットオブジェクトの構造バリデーション
 */
function isValidPreset(item: unknown): item is Preset {
  if (!item || typeof item !== 'object') return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    typeof p.moduleId === 'string' &&
    p.params !== null &&
    typeof p.params === 'object' &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

/**
 * ストレージからプリセット一覧を読み込む。
 * 破損した JSON や無効な要素は安全にスキップ・空配列フォールバックする。
 */
export function loadPresets(storage: StorageLike): Preset[] {
  try {
    const raw = storage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    let list: readonly unknown[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as PresetStore).presets)) {
      list = (parsed as PresetStore).presets;
    }
    return list.filter(isValidPreset);
  } catch {
    return [];
  }
}

export interface SavePresetInput {
  readonly id?: string;
  readonly name: string;
  readonly moduleId: ModuleId;
  readonly params: ParamValues;
  readonly batchCount?: number;
  readonly outputMode?: OutputMode;
  readonly answerOrder?: AnswerOrder;
}

/**
 * プリセットを保存（新規追加または更新）し、保存されたプリセットを返す。
 * QuotaExceededError や SecurityError 等の例外も安全に処理する。
 */
export function savePreset(
  storage: StorageLike,
  input: SavePresetInput,
): Preset {
  const current = loadPresets(storage);
  const now = new Date().toISOString();

  let target: Preset;
  const existingIdx = input.id ? current.findIndex((p) => p.id === input.id) : -1;

  if (existingIdx !== -1) {
    const existing = current[existingIdx]!;
    target = {
      id: existing.id,
      name: input.name,
      moduleId: input.moduleId,
      params: input.params,
      batchCount: input.batchCount,
      outputMode: input.outputMode,
      answerOrder: input.answerOrder,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    current[existingIdx] = target;
  } else {
    target = {
      id: input.id ?? generatePresetId(),
      name: input.name,
      moduleId: input.moduleId,
      params: input.params,
      batchCount: input.batchCount,
      outputMode: input.outputMode,
      answerOrder: input.answerOrder,
      createdAt: now,
      updatedAt: now,
    };
    current.push(target);
  }

  const store: PresetStore = {
    version: 1,
    presets: current,
  };

  try {
    storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // QuotaExceededError や SecurityError 等で書き込みに失敗しても
    // アプリ全体のクラッシュを防ぐ
  }

  return target;
}

/**
 * 指定 ID のプリセットを削除し、更新後のプリセット一覧を返す。
 */
export function deletePreset(storage: StorageLike, id: string): Preset[] {
  const current = loadPresets(storage);
  const filtered = current.filter((p) => p.id !== id);

  const store: PresetStore = {
    version: 1,
    presets: filtered,
  };

  try {
    storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 安全ハンドリング
  }

  return filtered;
}
