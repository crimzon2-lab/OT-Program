/**
 * M03 符号変換課題（SDMT様）モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M03Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { generateM03Data } from './logic';
import { renderM03 } from './render';

export const m03ParamSchema: ParamSchema<M03Params> = [
  {
    code: 1,
    key: 'pairCount',
    label: '対応ペア数',
    kind: 'int',
    min: 6,
    max: 9,
    step: 1,
    default: 9,
  },
  {
    code: 2,
    key: 'rows',
    label: '行数',
    kind: 'int',
    min: 3,
    max: 10,
    step: 1,
    default: 6,
  },
  {
    code: 3,
    key: 'cols',
    label: '列数',
    kind: 'int',
    min: 8,
    max: 16,
    step: 1,
    default: 12,
  },
  {
    code: 4,
    key: 'practiceCells',
    label: '練習マス数',
    kind: 'int',
    min: 0,
    max: 12,
    step: 1,
    default: 6,
  },
  {
    code: 5,
    key: 'shuffleMapping',
    label: '対応表シャッフル',
    kind: 'bool',
    default: true,
  },
];

export const m03SymbolDigitModule: TaskModule<M03Params> = {
  id: 'M03',
  domain: 'attention',
  title: '符号変換課題',
  shortTitle: '符号変換',
  description:
    '上部の対応表を参照しながら記号に対応する数字を素早く正確に書き込む処理速度・視覚走査・作業記憶課題（SDMT様）。',
  paramSchema: m03ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M03Params & CommonParams;
    const data = generateM03Data(ctx, fullParams);
    return renderM03(ctx, fullParams, data);
  },
};

export const m03Module: AnyTaskModule = defineModule(m03SymbolDigitModule);
