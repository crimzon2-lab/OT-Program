/**
 * M12 服薬管理・残薬計算 モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M12Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { renderM12 } from './render';

export const m12ParamSchema: ParamSchema<M12Params> = [
  {
    code: 1,
    key: 'drugCount',
    label: '薬剤数',
    kind: 'int',
    min: 3,
    max: 6,
    step: 1,
    default: 4,
  },
  {
    code: 2,
    key: 'labelStyle',
    label: 'お薬名の表記',
    kind: 'select',
    default: 'letterEffect',
    options: [
      { value: 'letterEffect', label: '記号＋効能（A錠：血圧の薬）' },
      { value: 'fictionalEffect', label: '架空名＋効能（ケツアール錠：血圧の薬）' },
      { value: 'letterOnly', label: '記号のみ（A錠）' },
    ],
  },
  {
    code: 3,
    key: 'organizer',
    label: '配薬表の形式',
    kind: 'select',
    default: 'daily',
    options: [
      { value: 'daily', label: '1日4区分（朝・昼・夕・寝る前）' },
      { value: 'weekly', label: '1週間カレンダー' },
    ],
  },
  {
    code: 4,
    key: 'includeCalc',
    label: '必要総数・残薬計算を含める',
    kind: 'bool',
    default: true,
  },
  {
    code: 5,
    key: 'travelDays',
    label: '旅行日数',
    kind: 'select',
    default: '7',
    options: [
      { value: '7', label: '7日間' },
      { value: '14', label: '14日間' },
    ],
    visibleWhen: [{ key: 'includeCalc', equals: true }],
  },
  {
    code: 6,
    key: 'includeStock',
    label: '残薬・過不足計算問題を含める',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'includeCalc', equals: true }],
  },
];

export const m12MedicationModule: TaskModule<M12Params> = {
  id: 'M12',
  domain: 'iadl',
  title: '服薬管理・残薬計算',
  shortTitle: '服薬管理',
  description:
    'お薬説明書を読み取り、朝・昼・夕・寝る前への配薬仕分け、および旅行日数分の必要錠数・残薬過不足を計算するIADL訓練課題。',
  paramSchema: m12ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M12Params & CommonParams;
    return renderM12(ctx, fullParams);
  },
};

export const m12Module: AnyTaskModule = defineModule(m12MedicationModule);
