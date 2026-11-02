/**
 * M04 仮名拾い・二重課題モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  HIRAGANA_SEION,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M04Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM04Data } from './logic';
import { renderM04 } from './render';

export const m04ParamSchema: ParamSchema<M04Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題形式',
    kind: 'select',
    options: [
      { value: 'passage', label: '意味文（二重課題）' },
      { value: 'random', label: '無意味文字列' },
    ],
    default: 'passage',
  },
  {
    code: 2,
    key: 'targetPreset',
    label: 'ターゲット指定',
    kind: 'select',
    options: [
      { value: 'vowels', label: '母音（あいうえお）' },
      { value: 'custom', label: '任意指定' },
    ],
    default: 'vowels',
  },
  {
    code: 3,
    key: 'customTargets',
    label: '任意ターゲット文字',
    kind: 'charSet',
    alphabet: HIRAGANA_SEION,
    minCount: 1,
    maxCount: 5,
    default: 'あ',
    visibleWhen: [{ key: 'targetPreset', equals: 'custom' }],
  },
  {
    code: 4,
    key: 'includeSmallKana',
    label: '小書き文字を含める',
    kind: 'bool',
    default: false,
  },
  {
    code: 5,
    key: 'rows',
    label: '行数',
    kind: 'int',
    min: 6,
    max: 20,
    step: 1,
    default: 10,
    visibleWhen: [{ key: 'subMode', equals: 'random' }],
  },
  {
    code: 6,
    key: 'charsPerRow',
    label: '1行の文字数',
    kind: 'int',
    min: 15,
    max: 35,
    step: 1,
    default: 25,
    visibleWhen: [{ key: 'subMode', equals: 'random' }],
  },
  {
    code: 7,
    key: 'targetRate',
    label: 'ターゲット出現率',
    kind: 'int',
    min: 10,
    max: 30,
    step: 5,
    default: 20,
    unit: '%',
    visibleWhen: [{ key: 'subMode', equals: 'random' }],
  },
  {
    code: 8,
    key: 'dakuonDecoys',
    label: '濁音妨害刺激',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: 'random' }],
  },
  {
    code: 9,
    key: 'spacing',
    label: '文字組み',
    kind: 'select',
    options: [
      { value: 'solid', label: 'ベタ組み' },
      { value: 'wakachi', label: '分かち書き' },
    ],
    default: 'solid',
    visibleWhen: [{ key: 'subMode', equals: 'passage' }],
  },
  {
    code: 10,
    key: 'questionCount',
    label: '内容確認問題数',
    kind: 'int',
    min: 2,
    max: 3,
    step: 1,
    default: 3,
    visibleWhen: [{ key: 'subMode', equals: 'passage' }],
  },
  {
    code: 11,
    key: 'questionPlacement',
    label: '問題の配置',
    kind: 'select',
    options: [
      { value: 'samePage', label: '同じ用紙' },
      { value: 'nextPage', label: '次の用紙' },
    ],
    default: 'samePage',
    visibleWhen: [{ key: 'subMode', equals: 'passage' }],
  },
  {
    code: 12,
    key: 'charSizeMm',
    label: '文字サイズ',
    kind: 'int',
    min: 4,
    max: 9,
    step: 1,
    default: 6,
    unit: 'mm',
  },
];

export const m04KanaPickupModule: TaskModule<M04Params> = {
  id: 'M04',
  domain: 'attention',
  title: '仮名拾い課題',
  shortTitle: '仮名拾い',
  description:
    '文章やランダム文字列から指定された仮名を拾い出し（抹消）、文章の意味理解と注意配分を評価・訓練する二重課題。',
  paramSchema: m04ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M04Params & CommonParams;
    const data = generateM04Data(ctx, fullParams);
    return renderM04(ctx, fullParams, data);
  },
};

export const m04Module: AnyTaskModule = defineModule(m04KanaPickupModule);
