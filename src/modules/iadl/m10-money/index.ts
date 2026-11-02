/**
 * M10: 金銭管理・買い物計算 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M10Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { renderM10 } from './render';

export const m10ParamSchema: ParamSchema<M10Params> = [
  {
    code: 1,
    key: 'subMode',
    label: 'サブモード',
    kind: 'select',
    options: [
      { value: 'coinTotal', label: 'お金の合計' },
      { value: 'payment', label: '支払い選択' },
      { value: 'shopping', label: '買い物計算' },
    ],
    default: 'coinTotal',
  },
  {
    code: 2,
    key: 'problemCount',
    label: '問題数',
    kind: 'int',
    min: 2,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: ['coinTotal', 'payment'] }],
  },
  {
    code: 3,
    key: 'maxPieces',
    label: '1問の最大枚数',
    kind: 'int',
    min: 3,
    max: 12,
    step: 1,
    default: 8,
    visibleWhen: [{ key: 'subMode', equals: 'coinTotal' }],
  },
  {
    code: 4,
    key: 'includeBills',
    label: '紙幣を含める',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: ['coinTotal', 'payment'] }],
  },
  {
    code: 5,
    key: 'paymentTask',
    label: '支払い課題種別',
    kind: 'select',
    options: [
      { value: 'exact', label: 'ちょうど支払う' },
      { value: 'minChange', label: 'おつりが最少' },
    ],
    default: 'exact',
    visibleWhen: [{ key: 'subMode', equals: 'payment' }],
  },
  {
    code: 6,
    key: 'priceMax',
    label: '支払額の上限',
    kind: 'int',
    min: 300,
    max: 10000,
    step: 100,
    default: 2000,
    unit: '円',
    visibleWhen: [{ key: 'subMode', equals: 'payment' }],
  },
  {
    code: 7,
    key: 'shopItemCount',
    label: '価格表の品目数',
    kind: 'int',
    min: 8,
    max: 15,
    step: 1,
    default: 12,
    visibleWhen: [{ key: 'subMode', equals: 'shopping' }],
  },
  {
    code: 8,
    key: 'listCount',
    label: '買い物リストの品目数',
    kind: 'int',
    min: 2,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'shopping' }],
  },
  {
    code: 9,
    key: 'shoppingLevel',
    label: '買い物難易度',
    kind: 'select',
    options: [
      { value: 'basic', label: '合計とおつり（標準）' },
      { value: 'budget', label: '予算内の組み合わせ' },
      { value: 'discount', label: '割引・個数指定' },
    ],
    default: 'basic',
    visibleWhen: [{ key: 'subMode', equals: 'shopping' }],
  },
  {
    code: 10,
    key: 'includeQuantity',
    label: '複数個の購入を含める',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: 'shopping' }],
  },
];

export const m10MoneyModule: TaskModule<M10Params> = {
  id: 'M10',
  domain: 'iadl',
  title: '金銭管理・買い物計算',
  shortTitle: '金銭計算',
  description:
    '硬貨・紙幣の合計、支払い選択、買い物リストに基づく価格・割引・お釣り計算など、金銭管理とIADL遂行機能を訓練する課題。',
  paramSchema: m10ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M10Params & CommonParams;
    return renderM10(ctx, fullParams);
  },
};

export const m10Module: AnyTaskModule = defineModule(m10MoneyModule);
