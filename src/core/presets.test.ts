import { describe, expect, it } from 'vitest';
import { PRESET_STORAGE_KEY, type StorageLike } from '../types/schema';
import {
  createMemoryStorage,
  deletePreset,
  generatePresetId,
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
});
