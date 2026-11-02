/**
 * M07 連続計算・紙面N-back モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M07Params,
  type Orientation,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM07Data } from './logic';
import { renderM07 } from './render';

export const m07ParamSchema: ParamSchema<M07Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題モード',
    kind: 'select',
    options: [
      { value: 'serialAddition', label: '連続加算' },
      { value: 'nBack', label: '紙面N-back' },
    ],
    default: 'serialAddition',
  },
  {
    code: 2,
    key: 'additionRows',
    label: '加算行数',
    kind: 'int',
    min: 5,
    max: 20,
    step: 1,
    default: 12,
    visibleWhen: [{ key: 'subMode', equals: 'serialAddition' }],
  },
  {
    code: 3,
    key: 'additionDigits',
    label: '1行の数字数',
    kind: 'int',
    min: 10,
    max: 30,
    step: 1,
    default: 20,
    visibleWhen: [{ key: 'subMode', equals: 'serialAddition' }],
  },
  {
    code: 4,
    key: 'nBackLevel',
    label: 'N-backレベル',
    kind: 'select',
    options: [
      { value: '1', label: '1-back' },
      { value: '2', label: '2-back' },
    ],
    default: '1',
    visibleWhen: [{ key: 'subMode', equals: 'nBack' }],
  },
  {
    code: 5,
    key: 'nBackItem',
    label: '刺激文字種',
    kind: 'select',
    options: [
      { value: 'digit', label: '数字' },
      { value: 'hiragana', label: 'ひらがな' },
      { value: 'katakana', label: 'カタカナ' },
      { value: 'latin', label: '英字' },
    ],
    default: 'digit',
    visibleWhen: [{ key: 'subMode', equals: 'nBack' }],
  },
  {
    code: 6,
    key: 'nBackRows',
    label: '系列行数',
    kind: 'int',
    min: 3,
    max: 10,
    step: 1,
    default: 6,
    visibleWhen: [{ key: 'subMode', equals: 'nBack' }],
  },
  {
    code: 7,
    key: 'nBackLength',
    label: '1行の項目数',
    kind: 'int',
    min: 10,
    max: 20,
    step: 1,
    default: 15,
    visibleWhen: [{ key: 'subMode', equals: 'nBack' }],
  },
  {
    code: 8,
    key: 'matchRate',
    label: 'ターゲット一致率',
    kind: 'int',
    min: 25,
    max: 35,
    step: 1,
    default: 30,
    unit: '%',
    visibleWhen: [{ key: 'subMode', equals: 'nBack' }],
  },
];

export const m07SerialNBackModule: TaskModule<M07Params> = {
  id: 'M07',
  domain: 'memory',
  title: '連続計算・N-back',
  shortTitle: '連続加算・N-back',
  description:
    '作業スピードと持続性注意を評価する連続加算課題と、ワーキングメモリの更新能を評価する紙面N-back課題。',
  paramSchema: m07ParamSchema,
  orientation: (_params): Orientation => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M07Params & CommonParams;
    const data = generateM07Data(ctx, fullParams);
    return renderM07(ctx, fullParams, data);
  },
};

export const m07Module: AnyTaskModule = defineModule(m07SerialNBackModule);
