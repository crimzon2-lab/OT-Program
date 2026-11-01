/**
 * M02 TMT様課題 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M02Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM02Data } from './logic';
import { renderM02 } from './render';

export const m02ParamSchema: ParamSchema<M02Params> = [
  {
    code: 1,
    key: 'part',
    label: 'パート',
    kind: 'select',
    options: [
      { value: 'A', label: 'Part A（数字）' },
      { value: 'B', label: 'Part B（数字とかな）' },
    ],
    default: 'A',
  },
  {
    code: 2,
    key: 'nodeCount',
    label: 'ノード数',
    kind: 'int',
    min: 10,
    max: 30,
    step: 1,
    default: 25,
  },
  {
    code: 3,
    key: 'nodeDiameterMm',
    label: 'ノード直径',
    kind: 'int',
    min: 6,
    max: 16,
    step: 1,
    default: 10,
    unit: 'mm',
  },
  {
    code: 4,
    key: 'orientation',
    label: '用紙向き',
    kind: 'select',
    options: [
      { value: 'landscape', label: '横向き' },
      { value: 'portrait', label: '縦向き' },
    ],
    default: 'landscape',
  },
  {
    code: 5,
    key: 'practice',
    label: '練習枠',
    kind: 'bool',
    default: true,
  },
];

export const m02TmtModule: TaskModule<M02Params> = {
  id: 'M02',
  domain: 'attention',
  title: 'TMT様課題',
  shortTitle: 'TMT',
  description:
    '用紙上に散らばった数字やひらがなを順番に線で結ぶ注意の持続・転換（セットシフティング）・視空間走査課題。',
  paramSchema: m02ParamSchema,
  orientation: (params) => (params as M02Params).orientation ?? 'landscape',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M02Params & CommonParams;
    const data = generateM02Data(ctx, fullParams);
    return renderM02(ctx, fullParams, data);
  },
};

export const m02Module: AnyTaskModule = defineModule(m02TmtModule);
