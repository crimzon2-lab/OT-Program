/**
 * M08 サブモード C: 意味カテゴリ分類（仲間外れ選択・指定カテゴリ探索）
 * ARCHITECTURE.md §8, §9, §10 準拠
 */

import { VOCABULARY, VOCAB_CATEGORY_IDS, VOCAB_CATEGORY_MAP } from '../../../data/vocabulary';
import type { GenerateContext, M08Params, VocabCategoryId, VocabEntry } from '../../../types/schema';

export interface OddOneOutChoice {
  readonly choiceIndex: number; // 1-based (1..groupSize)
  readonly entry: VocabEntry;
  readonly isOdd: boolean;
}

export interface OddOneOutProblemItem {
  readonly index: number;
  readonly mainCategory: VocabCategoryId;
  readonly oddCategory: VocabCategoryId;
  readonly choices: readonly OddOneOutChoice[];
  /** 正解（仲間外れ）の選択肢番号 (1-based) */
  readonly answerChoiceIndex: number;
  /** 正解（仲間外れ）のエントリ */
  readonly answerEntry: VocabEntry;
}

export interface FindAllGridItem {
  readonly index: number;
  readonly entry: VocabEntry;
  readonly isTarget: boolean;
}

export interface CategoryData {
  readonly subMode: 'category';
  readonly categoryTask: 'oddOneOut' | 'findAll';
  readonly oddItems?: readonly OddOneOutProblemItem[];
  readonly findAllItems?: readonly FindAllGridItem[];
  readonly targetCategory?: VocabCategoryId;
  readonly targetPhrase?: string;
  readonly totalTargets?: number;
}

/**
 * 仲間外れ選択（oddOneOut）の問題データを生成する
 */
export function generateOddOneOut(ctx: GenerateContext, params: M08Params): CategoryData {
  const allowedCategories = params.categories.filter((c): c is VocabCategoryId =>
    VOCAB_CATEGORY_IDS.includes(c as VocabCategoryId),
  );
  const activeCategories = allowedCategories.length > 0 ? allowedCategories : [...VOCAB_CATEGORY_IDS];

  const groupSize = Math.max(4, Math.min(5, params.groupSize));
  const mainCount = groupSize - 1; // 3 または 4

  const oddItems: OddOneOutProblemItem[] = [];

  for (let q = 0; q < params.itemCount; q++) {
    // 親カテゴリを選定
    const mainCat = activeCategories[q % activeCategories.length]!;

    // 異カテゴリを選定（mainCat と異なり、VOCAB_CATEGORY_IDS から選定）
    const otherCats = VOCAB_CATEGORY_IDS.filter((c) => c !== mainCat);
    const oddCat = ctx.rng.pick(otherCats);

    // mainCat に属し、oddCat を alsoCategories に持たない語
    const mainPool = VOCABULARY.filter(
      (v) => v.category === mainCat && (!v.alsoCategories || !v.alsoCategories.includes(oddCat)),
    );

    // oddCat に属し、mainCat を alsoCategories に持たない語
    const oddPool = VOCABULARY.filter(
      (v) => v.category === oddCat && (!v.alsoCategories || !v.alsoCategories.includes(mainCat)),
    );

    const chosenMain = ctx.draw<VocabEntry>(
      `m08-odd-main-${mainCat}-${q}`,
      mainPool.length >= mainCount ? mainPool : VOCABULARY.filter((v) => v.category === mainCat),
      mainCount,
    );

    const chosenOddList = ctx.draw<VocabEntry>(
      `m08-odd-target-${oddCat}-${q}`,
      oddPool.length >= 1 ? oddPool : VOCABULARY.filter((v) => v.category === oddCat),
      1,
    );
    const chosenOdd = chosenOddList[0]!;

    // 選択肢群を結合してシャッフル
    const unarranged = [
      ...chosenMain.map((entry) => ({ entry, isOdd: false })),
      { entry: chosenOdd, isOdd: true },
    ];
    const shuffled = ctx.rng.shuffle(unarranged);

    const choices: OddOneOutChoice[] = shuffled.map((item, idx) => ({
      choiceIndex: idx + 1,
      entry: item.entry,
      isOdd: item.isOdd,
    }));

    const answerChoice = choices.find((c) => c.isOdd)!;

    oddItems.push({
      index: q + 1,
      mainCategory: mainCat,
      oddCategory: oddCat,
      choices,
      answerChoiceIndex: answerChoice.choiceIndex,
      answerEntry: answerChoice.entry,
    });
  }

  return {
    subMode: 'category',
    categoryTask: 'oddOneOut',
    oddItems,
  };
}

/**
 * 指定カテゴリ探索（findAll）の問題データを生成する
 */
export function generateFindAll(ctx: GenerateContext, params: M08Params): CategoryData {
  const allowedCategories = params.categories.filter((c): c is VocabCategoryId =>
    VOCAB_CATEGORY_IDS.includes(c as VocabCategoryId),
  );
  const activeCategories = allowedCategories.length > 0 ? allowedCategories : [...VOCAB_CATEGORY_IDS];

  // 探索ターゲットカテゴリを1つ選定
  const targetCategory = ctx.rng.pick(activeCategories);
  const targetCatInfo = VOCAB_CATEGORY_MAP[targetCategory];
  const targetPhrase = targetCatInfo ? targetCatInfo.findAllPhrase : '指定されたカテゴリの言葉';

  // 提示総数（20〜30語）
  const totalCount = Math.max(20, Math.min(30, params.findAllCount));
  // ターゲット語数（約35%：7〜11語）
  const targetCount = Math.max(5, Math.min(12, Math.round(totalCount * 0.35)));
  const distractorCount = totalCount - targetCount;

  // ターゲット候補
  const targetPool = VOCABULARY.filter((v) => v.category === targetCategory);

  // ディストラクター候補（ターゲットカテゴリに属さず、alsoCategories にも含まない語）
  const distractorPool = VOCABULARY.filter(
    (v) =>
      v.category !== targetCategory &&
      (!v.alsoCategories || !v.alsoCategories.includes(targetCategory)),
  );

  const targets = ctx.draw<VocabEntry>(
    `m08-findall-target-${targetCategory}`,
    targetPool,
    targetCount,
  );
  const distractors = ctx.draw<VocabEntry>(
    `m08-findall-dist-${targetCategory}`,
    distractorPool,
    distractorCount,
  );

  const combined = [
    ...targets.map((entry) => ({ entry, isTarget: true })),
    ...distractors.map((entry) => ({ entry, isTarget: false })),
  ];

  const shuffled = ctx.rng.shuffle(combined);

  const findAllItems: FindAllGridItem[] = shuffled.map((item, idx) => ({
    index: idx + 1,
    entry: item.entry,
    isTarget: item.isTarget,
  }));

  return {
    subMode: 'category',
    categoryTask: 'findAll',
    findAllItems,
    targetCategory,
    targetPhrase,
    totalTargets: targets.length,
  };
}

/**
 * サブモード C（意味カテゴリ分類）の問題データを生成する
 */
export function generateCategoryMode(ctx: GenerateContext, params: M08Params): CategoryData {
  if (params.categoryTask === 'findAll') {
    return generateFindAll(ctx, params);
  }
  return generateOddOneOut(ctx, params);
}
