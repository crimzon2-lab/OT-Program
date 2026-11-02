/**
 * M09: 迷路・ルート探索 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M09Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateMaze } from './logic';
import { renderM09 } from './render';

export const m09ParamSchema: ParamSchema<M09Params> = [
  {
    code: 1,
    key: 'gridSize',
    label: 'マス目の数',
    kind: 'int',
    min: 8,
    max: 25,
    step: 1,
    default: 12,
  },
  {
    code: 2,
    key: 'route',
    label: 'ルート',
    kind: 'select',
    options: [
      { value: 'tlToBr', label: '左上→右下' },
      { value: 'trToBl', label: '右上→左下' },
      { value: 'rightToLeft', label: '右端→左端（左側探索誘導）' },
      { value: 'leftToRight', label: '左端→右端' },
    ],
    default: 'tlToBr',
  },
  {
    code: 3,
    key: 'algorithm',
    label: 'アルゴリズム',
    kind: 'select',
    options: [
      { value: 'backtracker', label: '長い通路型（バックトラッカー）' },
      { value: 'prim', label: '分岐多め型（乱択Prim法）' },
    ],
    default: 'backtracker',
  },
  {
    code: 4,
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

export const m09MazeModule: TaskModule<M09Params> = {
  id: 'M09',
  domain: 'iadl',
  title: '迷路・ルート探索',
  shortTitle: '迷路',
  description:
    '閉路のない完全迷路を進むルート探索課題。スタートからゴールへの探索・計画・視空間走査を促します。',
  paramSchema: m09ParamSchema,
  orientation: (params) => (params as M09Params).orientation ?? 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M09Params & CommonParams;
    const data = generateMaze(ctx, fullParams);
    return renderM09(ctx, fullParams, data);
  },
};

export const m09Module: AnyTaskModule = defineModule(m09MazeModule);
