/**
 * M01 抹消課題 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M01Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM01Data } from './logic';
import { renderM01 } from './render';

export const m01ParamSchema: ParamSchema<M01Params> = [
  {
    code: 1,
    key: 'stimulusType',
    label: '刺激の種類',
    kind: 'select',
    options: [
      { value: 'hiragana', label: 'ひらがな' },
      { value: 'katakana', label: 'カタカナ' },
      { value: 'digit', label: '数字' },
      { value: 'latin', label: '英字' },
      { value: 'shape', label: '幾何学記号' },
    ],
    default: 'hiragana',
  },
  {
    code: 2,
    key: 'targetKinds',
    label: 'ターゲット種類数',
    kind: 'int',
    min: 1,
    max: 3,
    step: 1,
    default: 1,
  },
  {
    code: 3,
    key: 'layout',
    label: '配置方式',
    kind: 'select',
    options: [
      { value: 'scatter', label: 'ランダム散布' },
      { value: 'grid', label: 'グリッド整列' },
    ],
    default: 'scatter',
  },
  {
    code: 4,
    key: 'totalStimuli',
    label: '総刺激数',
    kind: 'int',
    min: 40,
    max: 320,
    step: 4,
    default: 160,
  },
  {
    code: 5,
    key: 'targetRate',
    label: 'ターゲット出現率',
    kind: 'int',
    min: 10,
    max: 40,
    step: 5,
    default: 20,
    unit: '%',
  },
  {
    code: 6,
    key: 'charSizeMm',
    label: '刺激サイズ',
    kind: 'int',
    min: 5,
    max: 14,
    step: 1,
    default: 8,
    unit: 'mm',
  },
  {
    code: 7,
    key: 'quadrantBalance',
    label: '4象限均等',
    kind: 'bool',
    default: true,
  },
  {
    code: 8,
    key: 'showTargetSample',
    label: '見本枠表示',
    kind: 'bool',
    default: true,
  },
  {
    code: 9,
    key: 'orientation',
    label: '用紙向き',
    kind: 'select',
    options: [
      { value: 'landscape', label: '横向き' },
      { value: 'portrait', label: '縦向き' },
    ],
    default: 'landscape',
  },
];

export const m01CancellationModule: TaskModule<M01Params> = {
  id: 'M01',
  domain: 'attention',
  title: '抹消課題',
  shortTitle: '抹消',
  description:
    '提示されたターゲット（文字・記号）を妨害刺激の中から見つけて抹消する注意機能・視空間探索課題。',
  paramSchema: m01ParamSchema,
  orientation: (params) => (params as M01Params).orientation ?? 'landscape',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M01Params & CommonParams;
    const data = generateM01Data(ctx, fullParams);
    return renderM01(ctx, fullParams, data);
  },
};

export const m01Module: AnyTaskModule = defineModule(m01CancellationModule);
