import { describe, expect, it } from 'vitest';
import { PRESET_STORAGE_KEY, type StorageLike } from '../types/schema';
import {
  createMemoryStorage,
  deletePreset,
  exportPresetsJson,
  generatePresetId,
  importPresetsJson,
  loadPresets,
  savePreset,
} from './presets';

describe('src/core/presets.ts', () => {
  it('generates unique IDs without crypto.randomUUID requirement', () => {
    const id1 = generatePresetId();
    const id2 = generatePresetId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('p-')).toBe(true);
  });

  it('saves, updates, loads, and deletes presets correctly', () => {
    const storage = createMemoryStorage();
    expect(loadPresets(storage)).toEqual([]);

    // Save new preset
    const p1 = savePreset(storage, {
      name: '抹消（簡単）',
      moduleId: 'M01',
      params: { difficulty: 1 },
      batchCount: 3,
      outputMode: 'problemOnly',
    });

    expect(p1.id).toBeDefined();
    expect(p1.name).toBe('抹消（簡単）');

    // Load presets
    const loaded1 = loadPresets(storage);
    expect(loaded1.length).toBe(1);
    expect(loaded1[0]!.id).toBe(p1.id);
    expect(loaded1[0]!.createdAt).toBe(p1.createdAt);

    // Update preset
    const p1Updated = savePreset(storage, {
      id: p1.id,
      name: '抹消（簡単・改）',
      moduleId: 'M01',
      params: { difficulty: 2 },
    });
    expect(p1Updated.id).toBe(p1.id);
    expect(p1Updated.name).toBe('抹消（簡単・改）');
    expect(p1Updated.createdAt).toBe(p1.createdAt);

    const loaded2 = loadPresets(storage);
    expect(loaded2.length).toBe(1);
    expect(loaded2[0]!.name).toBe('抹消（簡単・改）');

    // Delete preset
    const afterDelete = deletePreset(storage, p1.id);
    expect(afterDelete).toEqual([]);
    expect(loadPresets(storage)).toEqual([]);
  });

  it('safely handles corrupted JSON and filters invalid items', () => {
    const storage = createMemoryStorage();

    // Malformed JSON string
    storage.setItem(PRESET_STORAGE_KEY, '{ invalid json');
    expect(loadPresets(storage)).toEqual([]);

    // Array containing both valid and broken objects
    const mixed = [
      {
        id: 'p-valid-1',
        name: '正常',
        moduleId: 'M01',
        params: {},
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      { broken: true }, // broken item
      null,
      'just a string',
    ];
    storage.setItem(
      PRESET_STORAGE_KEY,
      JSON.stringify({ version: 1, presets: mixed }),
    );

    const loaded = loadPresets(storage);
    expect(loaded.length).toBe(1);
    expect(loaded[0]!.id).toBe('p-valid-1');
  });

  it('handles storage exception gracefully on getItem / setItem', () => {
    const faultyStorage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError: access denied');
      },
      setItem: () => {
        throw new Error('QuotaExceededError: storage full');
      },
      removeItem: () => {},
    };

    // getItem exception fallback
    expect(loadPresets(faultyStorage)).toEqual([]);

    // setItem exception safety
    expect(() =>
      savePreset(faultyStorage, {
        name: 'テスト',
        moduleId: 'M01',
        params: {},
      }),
    ).not.toThrow();

    expect(() => deletePreset(faultyStorage, 'p-123')).not.toThrow();
  });

  describe('exportPresetsJson & importPresetsJson', () => {
    it('エクスポートした JSON 文字列を別のストレージにインポートして完全復元できること（往復テスト）', () => {
      const storageA = createMemoryStorage();
      savePreset(storageA, {
        name: 'プリセット1',
        moduleId: 'M01',
        params: { stimulusType: 'hiragana', totalStimuli: 120 },
        batchCount: 2,
        outputMode: 'withAnswer',
        answerOrder: 'grouped',
      });
      savePreset(storageA, {
        name: 'プリセット2',
        moduleId: 'M02',
        params: { part: 'B', nodeCount: 16 },
      });

      const exportedJson = exportPresetsJson(storageA);
      expect(typeof exportedJson).toBe('string');
      expect(exportedJson).toContain('プリセット1');
      expect(exportedJson).toContain('プリセット2');

      const storageB = createMemoryStorage();
      const importResult = importPresetsJson(storageB, exportedJson);
      expect(importResult.imported).toBe(2);
      expect(importResult.total).toBe(2);
      expect(importResult.error).toBeUndefined();

      const loadedB = loadPresets(storageB);
      expect(loadedB.length).toBe(2);
      expect(loadedB[0]!.name).toBe('プリセット1');
      expect(loadedB[0]!.moduleId).toBe('M01');
      expect(loadedB[0]!.params.stimulusType).toBe('hiragana');
      expect(loadedB[0]!.batchCount).toBe(2);
      expect(loadedB[0]!.outputMode).toBe('withAnswer');
      expect(loadedB[1]!.name).toBe('プリセット2');
      expect(loadedB[1]!.moduleId).toBe('M02');
      expect(loadedB[1]!.params.part).toBe('B');
    });

    it('既存 ID のプリセットは上書きされ、新規 ID は追加されること（マージ機能）', () => {
      const storage = createMemoryStorage();
      savePreset(storage, {
        id: 'p-fixed-1',
        name: '初期名',
        moduleId: 'M01',
        params: { totalStimuli: 100 },
      });

      const importJson = JSON.stringify({
        presets: [
          {
            id: 'p-fixed-1',
            name: '更新名',
            moduleId: 'M01',
            params: { totalStimuli: 200 },
          },
          {
            id: 'p-fixed-2',
            name: '新規プリセット',
            moduleId: 'M03',
            params: { rows: 8 },
          },
        ],
      });

      const result = importPresetsJson(storage, importJson);
      expect(result.imported).toBe(2);
      expect(result.total).toBe(2);

      const loaded = loadPresets(storage);
      expect(loaded.length).toBe(2);
      const updated = loaded.find((p) => p.id === 'p-fixed-1');
      expect(updated?.name).toBe('更新名');
      expect(updated?.params.totalStimuli).toBe(200);

      const added = loaded.find((p) => p.id === 'p-fixed-2');
      expect(added?.name).toBe('新規プリセット');
    });

    it('パラメータ値が対象モジュールの sanitizeParams を通して安全に正規化されること', () => {
      const storage = createMemoryStorage();
      const importJson = JSON.stringify([
        {
          id: 'p-sanitize-test',
          name: '範囲外パラメータ',
          moduleId: 'M01',
          params: {
            totalStimuli: 99999, // M01 max は 320
            targetRate: -50,     // M01 min は 10
            stimulusType: 'invalid_type', // 不正な選択肢
          },
        },
      ]);

      const res = importPresetsJson(storage, importJson);
      expect(res.imported).toBe(1);

      const loaded = loadPresets(storage);
      const target = loaded.find((p) => p.id === 'p-sanitize-test');
      expect(target).toBeDefined();
      expect(target!.params.totalStimuli).toBeLessThanOrEqual(320);
      expect(target!.params.targetRate).toBeGreaterThanOrEqual(10);
      expect(target!.params.stimulusType).toBe('hiragana'); // 既定値にフォールバック
    });

    it('不正な構文の JSON や無効形式の場合にクラッシュせず安全にエラー情報を返すこと', () => {
      const storage = createMemoryStorage();

      // 構文エラー
      const res1 = importPresetsJson(storage, '{ broken json ...');
      expect(res1.imported).toBe(0);
      expect(res1.error).toContain('構文エラー');

      // プリセット形式でないプリミティブ値
      const res2 = importPresetsJson(storage, '"just a string"');
      expect(res2.imported).toBe(0);
      expect(res2.error).toBeDefined();

      // 未知の moduleId しか含まれない場合
      const res3 = importPresetsJson(storage, JSON.stringify([{ moduleId: 'UNKNOWN_99' }]));
      expect(res3.imported).toBe(0);
      expect(res3.error).toBeDefined();
    });
  });
});
