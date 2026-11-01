/**
 * アプリ状態管理・localStorage 永続化・シードコード連携
 * ARCHITECTURE.md §7 準拠
 */

import { getDefaultParams } from '../core/params';
import { createMemoryStorage } from '../core/presets';
import { getModule as defaultGetModule } from '../core/registry';
import {
  APP_STATE_STORAGE_KEY,
  BATCH_MAX,
  BATCH_MIN,
  MODULE_IDS,
  type AnswerOrder,
  type AnyTaskModule,
  type AppState,
  type JobRequest,
  type ModuleId,
  type OutputMode,
  type ParamValue,
  type ParamValues,
  type Preset,
  type StorageLike,
} from '../types/schema';
import { generateNumericSeed, normalizeSeedInput } from '../utils/prng';
import { parseSeedCode } from '../utils/seedCode';

export interface AppStoreOptions {
  readonly storage?: StorageLike;
  readonly getModule?: (id: ModuleId) => AnyTaskModule | undefined;
  readonly initialSeed?: number;
}

function getSafeStorage(custom?: StorageLike): StorageLike {
  if (custom) return custom;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__test_reha_print__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // file:// 等で拒否された場合はメモリフォールバック
  }
  return createMemoryStorage();
}

function isValidAppState(obj: unknown): obj is AppState {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.moduleId === 'string' &&
    MODULE_IDS.includes(s.moduleId as ModuleId) &&
    typeof s.seed === 'number' &&
    typeof s.batchCount === 'number' &&
    typeof s.outputMode === 'string' &&
    typeof s.answerOrder === 'string' &&
    s.paramsByModule !== null &&
    typeof s.paramsByModule === 'object'
  );
}

export class AppStore {
  private state: AppState;
  private startSheetIndex = 1;
  private seedInput: string;
  private readonly storage: StorageLike;
  private readonly getModule: (id: ModuleId) => AnyTaskModule | undefined;
  private readonly listeners = new Set<(store: AppStore) => void>();

  constructor(opts?: AppStoreOptions) {
    this.storage = getSafeStorage(opts?.storage);
    this.getModule = opts?.getModule ?? defaultGetModule;

    const defaultSeed = opts?.initialSeed ?? generateNumericSeed();
    const fallbackState: AppState = {
      moduleId: 'M01',
      paramsByModule: {},
      seed: defaultSeed,
      batchCount: 1,
      outputMode: 'problemOnly',
      answerOrder: 'grouped',
    };

    let loadedState: AppState | null = null;
    try {
      const raw = this.storage.getItem(APP_STATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidAppState(parsed)) {
          loadedState = parsed;
        }
      }
    } catch {
      // 復元失敗時はフォールバック
    }

    this.state = loadedState ?? fallbackState;
    this.seedInput = String(this.state.seed);
  }

  getState(): AppState {
    return this.state;
  }

  getStartSheetIndex(): number {
    return this.startSheetIndex;
  }

  getSeedInput(): string {
    return this.seedInput;
  }

  getCurrentModule(): AnyTaskModule | undefined {
    return this.getModule(this.state.moduleId);
  }

  getCurrentParams(): ParamValues {
    const existing = this.state.paramsByModule[this.state.moduleId];
    if (existing) {
      return existing;
    }
    const mod = this.getCurrentModule();
    if (mod) {
      return getDefaultParams(mod);
    }
    return { textScale: 100, strokeScale: 100 };
  }

  selectModule(moduleId: ModuleId): void {
    if (this.state.moduleId === moduleId) return;
    this.state = {
      ...this.state,
      moduleId,
    };
    this.startSheetIndex = 1;
    this.save();
    this.notify();
  }

  updateParam(key: string, value: ParamValue): void {
    const current = { ...this.getCurrentParams(), [key]: value };
    this.state = {
      ...this.state,
      paramsByModule: {
        ...this.state.paramsByModule,
        [this.state.moduleId]: current,
      },
    };
    this.save();
    this.notify();
  }

  resetCurrentModuleParams(): void {
    const mod = this.getCurrentModule();
    const defaults = mod ? getDefaultParams(mod) : { textScale: 100, strokeScale: 100 };
    this.state = {
      ...this.state,
      paramsByModule: {
        ...this.state.paramsByModule,
        [this.state.moduleId]: defaults,
      },
    };
    this.startSheetIndex = 1;
    this.save();
    this.notify();
  }

  setSeedInput(raw: string): void {
    this.seedInput = raw;
    const num = normalizeSeedInput(raw);
    if (num !== null) {
      this.state = {
        ...this.state,
        seed: num,
      };
      this.startSheetIndex = 1;
      this.save();
      this.notify();
    }
  }

  regenerateSeed(): void {
    const newSeed = generateNumericSeed();
    this.state = {
      ...this.state,
      seed: newSeed,
    };
    this.seedInput = String(newSeed);
    this.startSheetIndex = 1;
    this.save();
    this.notify();
  }

  setBatchCount(count: number): void {
    const clamped = Math.max(BATCH_MIN, Math.min(BATCH_MAX, Math.round(count)));
    if (this.state.batchCount === clamped) return;
    this.state = {
      ...this.state,
      batchCount: clamped,
    };
    this.startSheetIndex = 1;
    this.save();
    this.notify();
  }

  setOutputMode(mode: OutputMode): void {
    if (this.state.outputMode === mode) return;
    this.state = {
      ...this.state,
      outputMode: mode,
    };
    this.save();
    this.notify();
  }

  setAnswerOrder(order: AnswerOrder): void {
    if (this.state.answerOrder === order) return;
    this.state = {
      ...this.state,
      answerOrder: order,
    };
    this.save();
    this.notify();
  }

  applyPreset(preset: Preset): void {
    this.state = {
      ...this.state,
      moduleId: preset.moduleId,
      paramsByModule: {
        ...this.state.paramsByModule,
        [preset.moduleId]: preset.params,
      },
      batchCount: preset.batchCount ?? this.state.batchCount,
      outputMode: preset.outputMode ?? this.state.outputMode,
      answerOrder: preset.answerOrder ?? this.state.answerOrder,
    };
    this.startSheetIndex = 1;
    this.save();
    this.notify();
  }

  applySeedCode(
    codeString: string,
  ): { ok: true } | { ok: false; error: string; message: string } {
    const res = parseSeedCode(codeString, this.getModule);
    if (!res.ok) {
      return { ok: false, error: res.error, message: res.message };
    }

    const { moduleId, seed, sheetIndex, paramsDiff } = res.value;
    const mod = this.getModule(moduleId);
    const baseParams = mod ? getDefaultParams(mod) : { textScale: 100, strokeScale: 100 };
    const mergedParams = { ...baseParams, ...paramsDiff };

    this.state = {
      ...this.state,
      moduleId,
      seed,
      batchCount: 1, // シードコード読み込み時は1枚
      paramsByModule: {
        ...this.state.paramsByModule,
        [moduleId]: mergedParams,
      },
    };
    this.startSheetIndex = sheetIndex;
    this.seedInput = String(seed);
    this.save();
    this.notify();

    return { ok: true };
  }

  toJobRequest(): JobRequest {
    return {
      moduleId: this.state.moduleId,
      seed: this.state.seed,
      params: this.getCurrentParams(),
      batchCount: this.state.batchCount,
      outputMode: this.state.outputMode,
      answerOrder: this.state.answerOrder,
      startSheetIndex: this.startSheetIndex,
    };
  }

  subscribe(listener: (store: AppStore) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  private save(): void {
    try {
      this.storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // 安全に無視
    }
  }
}
