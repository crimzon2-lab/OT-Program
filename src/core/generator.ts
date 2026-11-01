/**
 * バッチ生成オーケストレータ（runJob）
 * ARCHITECTURE.md §2 準拠
 */

import {
  BATCH_MAX,
  BATCH_MIN,
  BODY_BOX,
  type AnyTaskModule,
  type GenerateContext,
  type GenWarning,
  type JobRequest,
  type JobResult,
  type PageBody,
  type RenderedPage,
  type WarningCode,
} from '../types/schema';
import { drawFromPool } from '../utils/pool';
import { createSheetRng } from '../utils/prng';
import { encodeSeedCode } from '../utils/seedCode';
import { sanitizeParams } from './params';
import { getModule } from './registry';

/**
 * JobRequest を受け取り、パラメータ検証、各シートの問題生成、ページ並び替え、警告集約を行う。
 */
export function runJob(
  req: JobRequest,
  moduleOverride?: AnyTaskModule,
): JobResult {
  const module = moduleOverride ?? getModule(req.moduleId);
  if (!module) {
    throw new Error(`Module ${req.moduleId} not found`);
  }

  // 1) 必ず最初に sanitizeParams を実行
  const { params, warnings: sanitizeWarnings } = sanitizeParams(module, req.params);
  const orientation = module.orientation(params);
  const body = BODY_BOX[orientation];

  const batchCount = Math.max(
    BATCH_MIN,
    Math.min(BATCH_MAX, Math.round(req.batchCount)),
  );
  const start = Math.max(1, req.startSheetIndex ?? 1);

  const rawWarnings: GenWarning[] = [...sanitizeWarnings];

  const sheetProblems: RenderedPage[][] = [];
  const sheetAnswers: RenderedPage[][] = [];

  for (let s = start; s < start + batchCount; s++) {
    const seedCode = encodeSeedCode(module, req.seed, s, params);
    const rng = createSheetRng(req.seed, module.id, s);
    const usedPoolKeys = new Set<string>();

    const warn = (code: WarningCode, message: string) => {
      rawWarnings.push({ code, message, sheetIndex: s });
    };

    const draw = <T>(poolKey: string, items: readonly T[], count: number): T[] => {
      if (usedPoolKeys.has(poolKey)) {
        throw new Error(
          `poolKey "${poolKey}" has already been drawn in this generate context`,
        );
      }
      usedPoolKeys.add(poolKey);
      return drawFromPool({
        seed: req.seed,
        moduleId: module.id,
        sheetIndex: s,
        poolKey,
        items,
        count,
        warn,
      });
    };

    const ctx: GenerateContext = {
      moduleId: module.id,
      seed: req.seed,
      sheetIndex: s,
      sheetCount: batchCount,
      seedCode,
      rng,
      orientation,
      body,
      draw,
      warn,
    };

    const genResult = module.generate(ctx, params);

    // ページの分類と出力対象判定
    const probBodies: PageBody[] = [];
    const ansBodies: PageBody[] = [];

    for (const p of genResult.pages) {
      if (p.pageRole === 'answer') {
        if (req.outputMode === 'withAnswer') {
          ansBodies.push(p);
        }
      } else {
        probBodies.push(p);
      }
    }

    const totalInSheet = probBodies.length + ansBodies.length;
    let pageNo = 1;

    const probRendered: RenderedPage[] = [];
    for (const pb of probBodies) {
      probRendered.push({
        moduleId: module.id,
        title: module.title,
        orientation,
        body: pb,
        seedCode,
        sheetIndex: s,
        sheetCount: batchCount,
        pageNo: pageNo++,
        pageTotal: totalInSheet,
      });
    }

    const ansRendered: RenderedPage[] = [];
    for (const ab of ansBodies) {
      ansRendered.push({
        moduleId: module.id,
        title: module.title,
        orientation,
        body: ab,
        seedCode,
        sheetIndex: s,
        sheetCount: batchCount,
        pageNo: pageNo++,
        pageTotal: totalInSheet,
      });
    }

    sheetProblems.push(probRendered);
    sheetAnswers.push(ansRendered);
  }

  // 2) ページの並び替え（grouped / interleaved）
  const pages: RenderedPage[] = [];
  if (req.outputMode === 'problemOnly') {
    for (const sheet of sheetProblems) {
      pages.push(...sheet);
    }
  } else {
    // withAnswer
    if (req.answerOrder === 'grouped') {
      for (const sheet of sheetProblems) {
        pages.push(...sheet);
      }
      for (const sheet of sheetAnswers) {
        pages.push(...sheet);
      }
    } else {
      // interleaved: 1枚目の問題群 → 1枚目の解答群 → 2枚目の問題群...
      for (let i = 0; i < batchCount; i++) {
        pages.push(...(sheetProblems[i] ?? []));
        pages.push(...(sheetAnswers[i] ?? []));
      }
    }
  }

  // 3) 警告の集約
  interface AggregatedEntry {
    code: WarningCode;
    baseMessage: string;
    sheets: number[];
  }
  const aggMap = new Map<string, AggregatedEntry>();

  for (const w of rawWarnings) {
    const key = `${w.code}:::${w.message}`;
    let entry = aggMap.get(key);
    if (!entry) {
      entry = { code: w.code, baseMessage: w.message, sheets: [] };
      aggMap.set(key, entry);
    }
    if (w.sheetIndex !== undefined && !entry.sheets.includes(w.sheetIndex)) {
      entry.sheets.push(w.sheetIndex);
    }
  }

  const warnings: GenWarning[] = [];
  for (const entry of aggMap.values()) {
    let message = entry.baseMessage;
    if (entry.sheets.length > 1) {
      entry.sheets.sort((a, b) => a - b);
      message = `${entry.baseMessage}（${entry.sheets.join('・')}枚目）`;
    } else if (entry.sheets.length === 1 && batchCount > 1) {
      message = `${entry.baseMessage}（${entry.sheets[0]}枚目）`;
    }
    warnings.push({
      code: entry.code,
      message,
    });
  }

  return {
    orientation,
    pages,
    warnings,
    params,
  };
}
