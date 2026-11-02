/**
 * M12 服薬管理・残薬計算 生成ロジック
 * ARCHITECTURE.md §5.6, §8, §9 準拠
 */

import { MEDICINE_TEMPLATES } from '../../../data/medicines';
import type {
  DoseTiming,
  GenerateContext,
  M12Params,
  MedicineTemplate,
} from '../../../types/schema';
import { DOSE_TIMING_LABELS } from '../../../types/schema';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface DrugStockQuestion {
  kind: 'shortage' | 'days';
  targetDrug: PreparedDrug;
  currentStock: number;
  questionText: string;
  answerText: string;
}

export interface PreparedDrug {
  id: string;
  letter: string;
  fictionalName: string;
  effect: string;
  form: '錠' | 'カプセル';
  shortName: string;
  displayName: string;
  timings: readonly DoseTiming[];
  dosePerTime: number;
  dailyTotal: number;
  requiredTotal: number; // travelDays分
}

export interface MedicationProblem {
  drugs: PreparedDrug[];
  organizer: 'daily' | 'weekly';
  includeCalc: boolean;
  travelDays: number;
  includeStock: boolean;
  timingSchedule: Record<DoseTiming, { drug: PreparedDrug; dose: number }[]>;
  stockQuestions: DrugStockQuestion[];
}

/**
 * M12 服薬管理問題の生成
 */
export function generateMedicationProblem(
  params: M12Params,
  ctx: GenerateContext
): MedicationProblem {
  const drugCount = Math.max(3, Math.min(6, params.drugCount));
  const chosenTemplates = ctx.draw(
    'medicines',
    MEDICINE_TEMPLATES,
    drugCount
  );

  const travelDays = params.travelDays === '14' ? 14 : 7;

  const drugs: PreparedDrug[] = chosenTemplates.map((tmpl: MedicineTemplate, idx: number) => {
    const letter = LETTERS[idx] ?? `薬${idx + 1}`;

    // 表示名の構築
    let shortName = `${letter}${tmpl.form}`;
    let displayName = `${letter}${tmpl.form}（${tmpl.effect}）`;
    if (params.labelStyle === 'fictionalEffect') {
      shortName = `${tmpl.fictionalName}${tmpl.form}`;
      displayName = `${tmpl.fictionalName}${tmpl.form}（${tmpl.effect}）`;
    } else if (params.labelStyle === 'letterOnly') {
      shortName = `${letter}${tmpl.form}`;
      displayName = `${letter}${tmpl.form}`;
    }

    const timings = ctx.rng.pick(tmpl.timingPatterns);
    const dosePerTime = ctx.rng.pick(tmpl.doseOptions);
    const dailyTotal = dosePerTime * timings.length;
    const requiredTotal = dailyTotal * travelDays;

    return {
      id: tmpl.id,
      letter,
      fictionalName: tmpl.fictionalName,
      effect: tmpl.effect,
      form: tmpl.form,
      shortName,
      displayName,
      timings,
      dosePerTime,
      dailyTotal,
      requiredTotal,
    };
  });

  // タイミング別配薬スケジュールの集計
  const timingSchedule: Record<DoseTiming, { drug: PreparedDrug; dose: number }[]> = {
    morning: [],
    noon: [],
    evening: [],
    bedtime: [],
  };

  for (const drug of drugs) {
    for (const t of drug.timings) {
      timingSchedule[t].push({ drug, dose: drug.dosePerTime });
    }
  }

  // 残薬・不足数計算問題の生成（includeCalc && includeStock）
  const stockQuestions: DrugStockQuestion[] = [];
  if (params.includeCalc && params.includeStock && drugs.length > 0) {
    // 設問1: 不足数計算
    const drug1 = ctx.rng.pick(drugs);
    // 手持ち残薬は 1日量 * k (1 <= k < travelDays) で不足が出るように設定
    const k1 = ctx.rng.int(1, travelDays - 1);
    const stock1 = drug1.dailyTotal * k1;
    const shortage = drug1.requiredTotal - stock1;

    stockQuestions.push({
      kind: 'shortage',
      targetDrug: drug1,
      currentStock: stock1,
      questionText: `旅行（${travelDays}日間）に向けて、「${drug1.displayName}」の手持ち残薬が ${stock1}${drug1.form} あります。旅行に必要な総数に対して、あと何${drug1.form}不足しますか？`,
      answerText: `${shortage}${drug1.form}（必要総数 ${drug1.requiredTotal}${drug1.form} − 残薬 ${stock1}${drug1.form} ＝ 不足 ${shortage}${drug1.form}）`,
    });

    // 設問2: 残日数計算（割り切れる整数）
    const remainingDrugs = drugs.filter((d) => d.id !== drug1.id);
    const drug2 = remainingDrugs.length > 0 ? ctx.rng.pick(remainingDrugs) : drug1;
    const k2 = ctx.rng.int(2, 6);
    const stock2 = drug2.dailyTotal * k2;
    const daysPossible = Math.floor(stock2 / drug2.dailyTotal);

    stockQuestions.push({
      kind: 'days',
      targetDrug: drug2,
      currentStock: stock2,
      questionText: `現在、「${drug2.displayName}」の手持ち残薬が ${stock2}${drug2.form} あります。この残薬であと何日分服用できますか？`,
      answerText: `${daysPossible}日分（残薬 ${stock2}${drug2.form} ÷ 1日量 ${drug2.dailyTotal}${drug2.form} ＝ ${daysPossible}日分）`,
    });
  }

  return {
    drugs,
    organizer: params.organizer,
    includeCalc: params.includeCalc,
    travelDays,
    includeStock: params.includeStock,
    timingSchedule,
    stockQuestions,
  };
}

/**
 * 薬剤のタイミング表示用テキスト（例: '朝食後、夕食後'）
 */
export function formatTimingLabels(timings: readonly DoseTiming[]): string {
  return timings.map((t) => DOSE_TIMING_LABELS[t]).join('・');
}
