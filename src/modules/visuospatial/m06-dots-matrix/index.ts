/**
 * M06 点つなぎ図形模写・空間記憶マトリクス モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M06Params,
  type Orientation,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM06Data } from './logic';
import { renderM06 } from './render';

export const m06ParamSchema: ParamSchema<M06Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題モード',
    kind: 'select',
    options: [
      { value: 'dotCopy', label: '点つなぎ図形模写' },
      { value: 'spatialMatrix', label: '空間記憶マトリクス' },
    ],
    default: 'dotCopy',
  },
  {
    code: 2,
    key: 'dotGrid',
    label: '格子サイズ',
    kind: 'int',
    min: 3,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'dotCopy' }],
  },
  {
    code: 3,
    key: 'segmentCount',
    label: '線分数',
    kind: 'int',
    min: 3,
    max: 12,
    step: 1,
    default: 6,
    visibleWhen: [{ key: 'subMode', equals: 'dotCopy' }],
  },
  {
    code: 4,
    key: 'allowDiagonal',
    label: '斜め線許可',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: 'dotCopy' }],
  },
  {
    code: 5,
    key: 'copyLayout',
    label: '模写配置',
    kind: 'select',
    options: [
      { value: 'leftRight', label: '左に見本・右に模写' },
      { value: 'topBottom', label: '上に見本・下に模写' },
    ],
    default: 'leftRight',
    visibleWhen: [{ key: 'subMode', equals: 'dotCopy' }],
  },
  {
    code: 6,
    key: 'figureCount',
    label: '図形数',
    kind: 'int',
    min: 1,
    max: 3,
    step: 1,
    default: 2,
    visibleWhen: [{ key: 'subMode', equals: 'dotCopy' }],
  },
  {
    code: 7,
    key: 'matrixSize',
    label: 'マトリクスサイズ',
    kind: 'int',
    min: 3,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'spatialMatrix' }],
  },
  {
    code: 8,
    key: 'filledCells',
    label: '黒塗りセル数',
    kind: 'int',
    min: 2,
    max: 12,
    step: 1,
    default: 5,
    visibleWhen: [{ key: 'subMode', equals: 'spatialMatrix' }],
  },
  {
    code: 9,
    key: 'matrixCount',
    label: 'マトリクス数',
    kind: 'int',
    min: 1,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'spatialMatrix' }],
  },
  {
    code: 10,
    key: 'orientation',
    label: '用紙向き',
    kind: 'select',
    options: [
      { value: 'portrait', label: '縦向き' },
      { value: 'landscape', label: '横向き' },
    ],
    default: 'portrait',
  },
];

export const m06DotsMatrixModule: TaskModule<M06Params> = {
  id: 'M06',
  domain: 'visuospatial',
  title: '点つなぎ・空間記憶',
  shortTitle: '点つなぎ・マトリクス',
  description:
    '視空間構成・図形模写能力を評価する点つなぎ課題と、視覚性ワーキングメモリ・空間位置記憶を評価するマトリクス課題。',
  paramSchema: m06ParamSchema,
  orientation: (params): Orientation => {
    return (params as M06Params).orientation ?? 'portrait';
  },
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M06Params & CommonParams;
    const data = generateM06Data(ctx, fullParams);
    return renderM06(ctx, fullParams, data);
  },
};

export const m06Module: AnyTaskModule = defineModule(m06DotsMatrixModule);
