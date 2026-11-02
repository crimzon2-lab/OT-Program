/**
 * M05 線分抹消・線分二等分 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M05Params,
  type Orientation,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM05Data } from './logic';
import { renderM05 } from './render';

export const m05ParamSchema: ParamSchema<M05Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題モード',
    kind: 'select',
    options: [
      { value: 'cancellation', label: '線分抹消' },
      { value: 'bisection', label: '線分二等分' },
    ],
    default: 'cancellation',
  },
  {
    code: 2,
    key: 'linesPerCell',
    label: '区画あたり線分数',
    kind: 'int',
    min: 2,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'cancellation' }],
  },
  {
    code: 3,
    key: 'lineLengthMm',
    label: '線分長',
    kind: 'int',
    min: 10,
    max: 30,
    step: 1,
    default: 20,
    unit: 'mm',
    visibleWhen: [{ key: 'subMode', equals: 'cancellation' }],
  },
  {
    code: 4,
    key: 'centerPractice',
    label: '中央練習線',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: 'cancellation' }],
  },
  {
    code: 5,
    key: 'bisectCount',
    label: '二等分線分数',
    kind: 'int',
    min: 5,
    max: 10,
    step: 1,
    default: 6,
    visibleWhen: [{ key: 'subMode', equals: 'bisection' }],
  },
  {
    code: 6,
    key: 'minLengthMm',
    label: '最短線分長',
    kind: 'int',
    min: 100,
    max: 200,
    step: 10,
    default: 100,
    unit: 'mm',
    visibleWhen: [{ key: 'subMode', equals: 'bisection' }],
  },
  {
    code: 7,
    key: 'maxLengthMm',
    label: '最長線分長',
    kind: 'int',
    min: 100,
    max: 200,
    step: 10,
    default: 200,
    unit: 'mm',
    visibleWhen: [{ key: 'subMode', equals: 'bisection' }],
  },
  {
    code: 8,
    key: 'maxOffsetMm',
    label: '最大左右偏位量',
    kind: 'int',
    min: 0,
    max: 50,
    step: 5,
    default: 30,
    unit: 'mm',
    visibleWhen: [{ key: 'subMode', equals: 'bisection' }],
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

export const m05LinesModule: TaskModule<M05Params> = {
  id: 'M05',
  domain: 'visuospatial',
  title: '線分抹消・二等分',
  shortTitle: '線分課題',
  description:
    '半側空間無視（USN）や視空間探索の評価・訓練のための線分抹消課題および線分二等分課題。',
  paramSchema: m05ParamSchema,
  orientation: (params): Orientation => {
    const p = params as M05Params;
    if (
      p.subMode === 'bisection' &&
      Math.max(p.minLengthMm, p.maxLengthMm) > 170
    ) {
      return 'landscape';
    }
    return p.orientation ?? 'landscape';
  },
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M05Params & CommonParams;
    const data = generateM05Data(ctx, fullParams);
    return renderM05(ctx, fullParams, data);
  },
};

export const m05Module: AnyTaskModule = defineModule(m05LinesModule);
