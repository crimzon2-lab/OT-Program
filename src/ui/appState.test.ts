import { describe, expect, it, vi } from 'vitest';
import type { AnyTaskModule, Preset } from '../types/schema';
import { createMemoryStorage } from '../core/presets';
import { encodeSeedCode } from '../utils/seedCode';
import { AppStore } from './appState';

describe('src/ui/appState.ts', () => {
  const mockM01: AnyTaskModule = {
    id: 'M01',
    domain: 'attention',
    title: '抹消課題',
    shortTitle: '抹消',
    description: '抹消課題説明',
    paramSchema: [
      {
        key: 'targetCount',
        code: 1,
        kind: 'int',
        label: '標的数',
        min: 10,
        max: 50,
        step: 5,
        default: 20,
      },
    ],
    orientation: () => 'portrait',
    generate: () => ({ pages: [] }),
  };

  const mockM02: AnyTaskModule = {
    id: 'M02',
    domain: 'attention',
    title: 'TMT様課題',
    shortTitle: 'TMT',
    description: 'TMT説明',
    paramSchema: [
      {
        key: 'part',
        code: 1,
        kind: 'select',
        label: 'パート',
        options: [
          { value: 'A', label: 'Part A' },
          { value: 'B', label: 'Part B' },
        ],
        default: 'A',
      },
    ],
    orientation: () => 'landscape',
    generate: () => ({ pages: [] }),
  };

  const getModule = (id: string) => {
    if (id === 'M01') return mockM01;
    if (id === 'M02') return mockM02;
    return undefined;
  };

  it('initializes with default state and generates job request', () => {
    const storage = createMemoryStorage();
    const store = new AppStore({ storage, getModule, initialSeed: 12345 });

    const req = store.toJobRequest();
    expect(req.moduleId).toBe('M01');
    expect(req.seed).toBe(12345);
    expect(req.batchCount).toBe(1);
    expect(req.startSheetIndex).toBe(1);
    expect(req.params.targetCount).toBe(20);
    expect(req.params.textScale).toBe(100);
  });

  it('maintains parameters per module across module switching', () => {
    const storage = createMemoryStorage();
    const store = new AppStore({ storage, getModule, initialSeed: 100 });

    // Update M01 param
    store.updateParam('targetCount', 35);
    expect(store.getCurrentParams().targetCount).toBe(35);

    // Switch to M02
    store.selectModule('M02');
    expect(store.getCurrentParams().part).toBe('A');
    store.updateParam('part', 'B');
    expect(store.getCurrentParams().part).toBe('B');

    // Switch back to M01 -> targetCount should remain 35
    store.selectModule('M01');
    expect(store.getCurrentParams().targetCount).toBe(35);
  });

  it('resets startSheetIndex back to 1 on subsequent user actions', () => {
    const storage = createMemoryStorage();
    const store = new AppStore({ storage, getModule, initialSeed: 100 });

    // Generate a valid seed code for M01 sheet 3 with targetCount 30
    const code = encodeSeedCode(mockM01, 55555, 3, {
      targetCount: 30,
      textScale: 100,
      strokeScale: 100,
    });

    const res = store.applySeedCode(code);
    expect(res.ok).toBe(true);
    expect(store.getStartSheetIndex()).toBe(3);
    expect(store.getState().seed).toBe(55555);

    // 1) regenerateSeed resets startSheetIndex to 1
    store.regenerateSeed();
    expect(store.getStartSheetIndex()).toBe(1);

    // Set back to 3
    store.applySeedCode(code);
    expect(store.getStartSheetIndex()).toBe(3);

    // 2) setSeedInput resets startSheetIndex to 1
    store.setSeedInput('77777');
    expect(store.getStartSheetIndex()).toBe(1);

    // Set back to 3
    store.applySeedCode(code);
    expect(store.getStartSheetIndex()).toBe(3);

    // 3) setBatchCount resets startSheetIndex to 1
    store.setBatchCount(2);
    expect(store.getStartSheetIndex()).toBe(1);

    // Set back to 3
    store.applySeedCode(code);
    expect(store.getStartSheetIndex()).toBe(3);

    // 4) selectModule resets startSheetIndex to 1
    store.selectModule('M02');
    expect(store.getStartSheetIndex()).toBe(1);

    // Switch back to M01 and set to 3
    store.selectModule('M01');
    store.applySeedCode(code);
    expect(store.getStartSheetIndex()).toBe(3);

    // 5) resetCurrentModuleParams resets startSheetIndex to 1
    store.resetCurrentModuleParams();
    expect(store.getStartSheetIndex()).toBe(1);

    // Set back to 3
    store.applySeedCode(code);
    expect(store.getStartSheetIndex()).toBe(3);

    // 6) applyPreset resets startSheetIndex to 1
    const dummyPreset: Preset = {
      id: 'p-1',
      name: 'Preset 1',
      moduleId: 'M01',
      params: { targetCount: 25 },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    store.applyPreset(dummyPreset);
    expect(store.getStartSheetIndex()).toBe(1);
  });

  it('does not crash when 0 modules are registered', () => {
    const storage = createMemoryStorage();
    const emptyGetModule = () => undefined;
    const store = new AppStore({ storage, getModule: emptyGetModule });

    expect(() => store.toJobRequest()).not.toThrow();
    expect(store.getCurrentParams()).toEqual({ textScale: 100, strokeScale: 100 });
  });

  it('notifies subscribers on state changes', () => {
    const storage = createMemoryStorage();
    const store = new AppStore({ storage, getModule });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.setBatchCount(3);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setBatchCount(4);
    expect(listener).toHaveBeenCalledTimes(1); // not called again
  });
});
