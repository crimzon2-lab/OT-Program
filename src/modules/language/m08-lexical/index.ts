/**
 * M08 言語モジュール（語彙・喚語・意味理解・短文）
 * ARCHITECTURE.md §8, §9 準拠
 */

import { VOCAB_CATEGORIES, VOCAB_CATEGORY_IDS } from '../../../data/vocabulary';
import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M08Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateAnagramMode } from './anagram';
import { generateCategoryMode } from './category';
import { generateFillMode } from './fill';
import type { M08GeneratedData } from './render';
import { renderM08Page } from './render';
import { generateSentenceMode } from './sentence';

export const m08ParamSchema: ParamSchema<M08Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題サブモード',
    kind: 'select',
    options: [
      { value: 'fill', label: '単語穴埋め' },
      { value: 'anagram', label: '仮名並べ替え' },
      { value: 'category', label: 'カテゴリ分類' },
      { value: 'sentence', label: '助詞・正誤判定' },
    ],
    default: 'fill',
  },
  {
    code: 2,
    key: 'categories',
    label: '語彙カテゴリ',
    kind: 'multi',
    options: VOCAB_CATEGORIES.map((c) => ({
      value: c.id,
      label: c.label,
    })),
    default: [...VOCAB_CATEGORY_IDS],
    minSelected: 1,
    visibleWhen: [{ key: 'subMode', equals: ['fill', 'anagram', 'category'] }],
  },
  {
    code: 3,
    key: 'notation',
    label: '表記形式',
    kind: 'select',
    options: [
      { value: 'kanjiRuby', label: '漢字＋ふりがな' },
      { value: 'hiragana', label: 'かなのみ' },
      { value: 'kanji', label: '漢字のみ' },
    ],
    default: 'kanjiRuby',
  },
  {
    code: 4,
    key: 'itemCount',
    label: '設問数',
    kind: 'int',
    min: 5,
    max: 20,
    step: 1,
    default: 10,
  },
  {
    code: 5,
    key: 'fillHint',
    label: '穴埋めヒント文字',
    kind: 'select',
    options: [
      { value: 'initial', label: '語頭音' },
      { value: 'final', label: '語尾音' },
      { value: 'initialFinal', label: '語頭＋語尾' },
      { value: 'random', label: 'ランダム' },
    ],
    default: 'initial',
    visibleWhen: [{ key: 'subMode', equals: 'fill' }],
  },
  {
    code: 6,
    key: 'showCategoryHint',
    label: 'カテゴリ名ヒント表示',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: ['fill', 'anagram'] }],
  },
  {
    code: 7,
    key: 'minLength',
    label: '語の文字数 下限',
    kind: 'int',
    min: 2,
    max: 6,
    step: 1,
    default: 3,
    visibleWhen: [{ key: 'subMode', equals: ['fill', 'anagram'] }],
  },
  {
    code: 8,
    key: 'maxLength',
    label: '語の文字数 上限',
    kind: 'int',
    min: 2,
    max: 6,
    step: 1,
    default: 5,
    visibleWhen: [{ key: 'subMode', equals: ['fill', 'anagram'] }],
  },
  {
    code: 9,
    key: 'categoryTask',
    label: 'カテゴリ課題種別',
    kind: 'select',
    options: [
      { value: 'oddOneOut', label: '仲間外れ選択' },
      { value: 'findAll', label: '指定カテゴリ探索' },
    ],
    default: 'oddOneOut',
    visibleWhen: [{ key: 'subMode', equals: 'category' }],
  },
  {
    code: 10,
    key: 'groupSize',
    label: '仲間外れ 選択肢数',
    kind: 'int',
    min: 4,
    max: 5,
    step: 1,
    default: 4,
    visibleWhen: [
      { key: 'subMode', equals: 'category' },
      { key: 'categoryTask', equals: 'oddOneOut' },
    ],
  },
  {
    code: 11,
    key: 'findAllCount',
    label: '指定探索 提示語数',
    kind: 'int',
    min: 20,
    max: 30,
    step: 1,
    default: 24,
    visibleWhen: [
      { key: 'subMode', equals: 'category' },
      { key: 'categoryTask', equals: 'findAll' },
    ],
  },
  {
    code: 12,
    key: 'sentenceTask',
    label: '短文課題種別',
    kind: 'select',
    options: [
      { value: 'particleBlank', label: '助詞の書き込み' },
      { value: 'particleChoice', label: '助詞の選択' },
      { value: 'judgement', label: '意味の正誤判定' },
    ],
    default: 'particleBlank',
    visibleWhen: [{ key: 'subMode', equals: 'sentence' }],
  },
];

export function generateM08Data(ctx: GenerateContext, params: M08Params): M08GeneratedData {
  switch (params.subMode) {
    case 'fill':
      return { subMode: 'fill', data: generateFillMode(ctx, params) };
    case 'anagram':
      return { subMode: 'anagram', data: generateAnagramMode(ctx, params) };
    case 'category':
      return { subMode: 'category', data: generateCategoryMode(ctx, params) };
    case 'sentence':
      return { subMode: 'sentence', data: generateSentenceMode(ctx, params) };
  }
}

export const m08LexicalModule: TaskModule<M08Params> = {
  id: 'M08',
  domain: 'language',
  title: '語彙・喚語・意味理解・短文',
  shortTitle: '語彙・短文',
  description: '失語症・高次脳機能障害向けの喚語・アナグラム・カテゴリ分類・助詞および文意味理解課題',
  paramSchema: m08ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M08Params & CommonParams;
    const data = generateM08Data(ctx, fullParams);
    const problemPage = renderM08Page(data, fullParams, 'problem');
    const answerPage = renderM08Page(data, fullParams, 'answer');

    return {
      pages: [problemPage, answerPage],
    };
  },
};

export const m08Module: AnyTaskModule = defineModule(m08LexicalModule);

