/**
 * 全12モジュール横断スモーク＆契約遵守テスト
 * ARCHITECTURE.md §4, §8, §11.3 準拠
 * TASKS.md Task 76
 */

import { describe, expect, it } from 'vitest';
import { runJob } from '../core/generator';
import { getDefaultParams, sanitizeParams } from '../core/params';
import { ALL_MODULES, getModule } from '../core/registry';
import { renderSheetHtml } from '../print/sheet';
import {
  MODULE_IDS,
  MODULE_PARAM_CODE_MAX,
  MODULE_PARAM_CODE_MIN,
  type AnyParamField,
  type AnyTaskModule,
  type ParamValues,
} from '../types/schema';
import { createSheetRng } from '../utils/prng';
import { encodeSeedCode, parseSeedCode } from '../utils/seedCode';

describe('Task 76: 全12モジュール横断スモーク＆契約遵守テスト', () => {
  it('ALL_MODULES に MODULE_IDS（M01〜M12）の全12モジュールが正しい順序で登録されていること', () => {
    expect(ALL_MODULES.length).toBe(12);
    expect(ALL_MODULES.map((m) => m.id)).toEqual(MODULE_IDS);
    for (const id of MODULE_IDS) {
      const m = getModule(id);
      expect(m).toBeDefined();
      expect(m?.id).toBe(id);
    }
  });

  it('各モジュールの paramSchema の code が 1..29 の範囲内で一意であり、default 値が有効であること', () => {
    for (const mod of ALL_MODULES) {
      const codes = new Set<number>();
      for (const field of mod.paramSchema) {
        expect(field.code).toBeGreaterThanOrEqual(MODULE_PARAM_CODE_MIN);
        expect(field.code).toBeLessThanOrEqual(MODULE_PARAM_CODE_MAX);
        expect(codes.has(field.code)).toBe(false);
        codes.add(field.code);

        // default 値の有効性検査
        switch (field.kind) {
          case 'int': {
            expect(field.default).toBeGreaterThanOrEqual(field.min);
            expect(field.default).toBeLessThanOrEqual(field.max);
            expect((field.default - field.min) % field.step).toBe(0);
            break;
          }
          case 'select': {
            const valid = field.options.some((o) => o.value === field.default);
            expect(valid).toBe(true);
            break;
          }
          case 'bool': {
            expect(typeof field.default).toBe('boolean');
            break;
          }
          case 'multi': {
            const optValues = new Set(field.options.map((o) => o.value));
            for (const v of field.default) {
              expect(optValues.has(v)).toBe(true);
            }
            if (field.minSelected !== undefined) {
              expect(field.default.length).toBeGreaterThanOrEqual(field.minSelected);
            }
            break;
          }
          case 'charSet': {
            const alphaSet = new Set(Array.from(field.alphabet));
            for (const c of Array.from(field.default)) {
              expect(alphaSet.has(c)).toBe(true);
            }
            if (field.minCount !== undefined) {
              expect(Array.from(field.default).length).toBeGreaterThanOrEqual(field.minCount);
            }
            break;
          }
        }
      }
    }
  });

  describe('全12モジュール × シード3通り × バッチ2枚でのスモーク＆完全再現性テスト', () => {
    const SEEDS = [482914, 123456, 999999];

    for (const mod of ALL_MODULES) {
      it(`[${mod.id}] ${mod.title}: 既定パラメータでの生成・非空・完全決定性`, () => {
        const defaultParams = getDefaultParams(mod);

        for (const seed of SEEDS) {
          const req = {
            moduleId: mod.id,
            seed,
            batchCount: 2,
            outputMode: 'withAnswer' as const,
            answerOrder: 'grouped' as const,
            params: defaultParams,
          };

          const res1 = runJob(req, mod);
          const res2 = runJob(req, mod);

          // ページが存在し、空文字列でないこと
          expect(res1.pages.length).toBeGreaterThanOrEqual(2);
          for (const page of res1.pages) {
            expect(page.body.markup.length).toBeGreaterThan(0);
            const sheetHtml = renderSheetHtml(page);
            expect(sheetHtml.length).toBeGreaterThan(0);
            expect(sheetHtml).toContain('class="sheet');
          }

          // 完全決定性（同一シード・同一パラメータでの2回実行が完全一致）
          expect(res1.pages.length).toBe(res2.pages.length);
          for (let i = 0; i < res1.pages.length; i++) {
            const p1 = res1.pages[i]!;
            const p2 = res2.pages[i]!;
            expect(p1.body.markup).toBe(p2.body.markup);
            expect(p1.seedCode).toBe(p2.seedCode);
          }
        }
      });
    }
  });

  describe('全12モジュール 全サブモード切替スモークテスト', () => {
    for (const mod of ALL_MODULES) {
      it(`[${mod.id}] ${mod.title}: 各 select フィールド（サブモード含む）全選択肢での生成検証`, () => {
        const defaultParams = getDefaultParams(mod);
        const selectFields = mod.paramSchema.filter(
          (f): f is Extract<AnyParamField, { kind: 'select' }> => f.kind === 'select',
        );

        // 各 select フィールドの各オプションを1つずつ切り替えて runJob を実行
        for (const field of selectFields) {
          for (const opt of field.options) {
            const testParams: ParamValues = {
              ...defaultParams,
              [field.key]: opt.value,
            };
            const sanitized = sanitizeParams(mod, testParams).params;

            const req = {
              moduleId: mod.id,
              seed: 555888,
              batchCount: 1,
              outputMode: 'withAnswer' as const,
              answerOrder: 'grouped' as const,
              params: sanitized,
            };

            const res = runJob(req, mod);
            expect(res.pages.length).toBeGreaterThanOrEqual(1);
            for (const p of res.pages) {
              expect(p.body.markup.length).toBeGreaterThan(0);
              const sheetHtml = renderSheetHtml(p);
              expect(sheetHtml.length).toBeGreaterThan(0);
            }
          }
        }
      });
    }
  });

  describe('全12モジュール シードコード30ケース往復再現性テスト', () => {
    function generateRandomParams(
      mod: AnyTaskModule,
      rng: ReturnType<typeof createSheetRng>,
    ): ParamValues {
      const defaultParams = getDefaultParams(mod);
      const params: Record<string, any> = { ...defaultParams };

      for (const field of mod.paramSchema) {
        // 50% の確率でフィールドの値をランダム変更
        if (!rng.chance(0.5)) continue;

        switch (field.kind) {
          case 'int': {
            const steps = Math.floor((field.max - field.min) / field.step);
            const k = rng.int(0, steps);
            params[field.key] = field.min + k * field.step;
            break;
          }
          case 'select': {
            params[field.key] = rng.pick(field.options).value;
            break;
          }
          case 'bool': {
            params[field.key] = rng.chance(0.5);
            break;
          }
          case 'multi': {
            const minSel = field.minSelected ?? 1;
            const count = rng.int(minSel, field.options.length);
            const selected = rng.sample(
              field.options.map((o) => o.value),
              count,
            );
            // options の出現順に整列
            params[field.key] = field.options
              .map((o) => o.value)
              .filter((v) => selected.includes(v));
            break;
          }
          case 'charSet': {
            const minCount = field.minCount ?? 1;
            const alphabetArr = Array.from(field.alphabet);
            const maxC = Math.min(field.maxCount ?? alphabetArr.length, alphabetArr.length);
            const count = rng.int(minCount, maxC);
            const sampled = rng.sample(alphabetArr, count);
            params[field.key] = alphabetArr
              .filter((ch) => sampled.includes(ch))
              .join('');
            break;
          }
        }
      }

      // 共通パラメータもたまに変更
      if (rng.chance(0.3)) {
        params.textScale = rng.pick([80, 90, 100, 110, 120, 150]);
      }
      if (rng.chance(0.3)) {
        params.strokeScale = rng.pick([100, 125, 150, 175, 200]);
      }

      return sanitizeParams(mod, params).params;
    }

    for (const mod of ALL_MODULES) {
      it(`[${mod.id}] ${mod.title}: ランダムパラメータ 30 ケースの encodeSeedCode -> parseSeedCode 往復完全一致`, () => {
        const rng = createSheetRng(777, mod.id, 1);
        const defaultParams = getDefaultParams(mod);

        for (let caseIdx = 0; caseIdx < 30; caseIdx++) {
          const testSeed = rng.int(1, 999999);
          const sheetIndex = rng.int(1, 10);
          const params = generateRandomParams(mod, rng);

          const code = encodeSeedCode(mod, testSeed, sheetIndex, params);
          expect(typeof code).toBe('string');
          expect(code.startsWith(`RP1-${mod.id}`)).toBe(true);

          const parseResult = parseSeedCode(code, getModule);
          if (!parseResult.ok) {
            throw new Error(`Parse failed for ${code}: ${parseResult.message}`);
          }

          expect(parseResult.ok).toBe(true);
          expect(parseResult.value.moduleId).toBe(mod.id);
          expect(parseResult.value.seed).toBe(testSeed);
          expect(parseResult.value.sheetIndex).toBe(sheetIndex);

          // 復元された params と元の sanitized params が完全一致
          const merged = { ...defaultParams, ...parseResult.value.paramsDiff };
          for (const field of mod.paramSchema) {
            expect(merged[field.key]).toEqual(params[field.key]);
          }
          if (params.textScale !== undefined) {
            expect(merged.textScale).toBe(params.textScale);
          }
          if (params.strokeScale !== undefined) {
            expect(merged.strokeScale).toBe(params.strokeScale);
          }
        }
      });
    }
  });
});
