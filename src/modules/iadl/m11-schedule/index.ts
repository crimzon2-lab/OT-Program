/**
 * M11 スケジュール・カレンダー モジュール定義
 * ARCHITECTURE.md §8, §9 準拠
 */

import {
  defineModule,
  type AnyTaskModule,
  type CommonParams,
  type GenerateContext,
  type GenerateResult,
  type M11Params,
  type ParamSchema,
  type TaskModule,
} from '../../../types/schema';
import { renderM11 } from './render';

export const m11ParamSchema: ParamSchema<M11Params> = [
  {
    code: 1,
    key: 'subMode',
    label: '課題モード',
    kind: 'select',
    default: 'calendar',
    options: [
      { value: 'calendar', label: '月間カレンダー' },
      { value: 'timetable', label: '1日タイムスケジュール' },
    ],
  },
  {
    code: 2,
    key: 'calendarSource',
    label: 'カレンダー種別',
    kind: 'select',
    default: 'practice',
    options: [
      { value: 'practice', label: '練習用（ランダム）' },
      { value: 'actual', label: '実在の年月' },
    ],
    visibleWhen: [{ key: 'subMode', equals: 'calendar' }],
  },
  {
    code: 3,
    key: 'year',
    label: '年',
    kind: 'int',
    min: 2020,
    max: 2040,
    step: 1,
    default: 2027,
    visibleWhen: [
      { key: 'subMode', equals: 'calendar' },
      { key: 'calendarSource', equals: 'actual' },
    ],
  },
  {
    code: 4,
    key: 'month',
    label: '月',
    kind: 'int',
    min: 1,
    max: 12,
    step: 1,
    default: 4,
    visibleWhen: [
      { key: 'subMode', equals: 'calendar' },
      { key: 'calendarSource', equals: 'actual' },
    ],
  },
  {
    code: 5,
    key: 'weekStart',
    label: '週の始まり',
    kind: 'select',
    default: 'sun',
    options: [
      { value: 'sun', label: '日曜始まり' },
      { value: 'mon', label: '月曜始まり' },
    ],
    visibleWhen: [{ key: 'subMode', equals: 'calendar' }],
  },
  {
    code: 6,
    key: 'conditionCount',
    label: '予定の件数',
    kind: 'int',
    min: 3,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'calendar' }],
  },
  {
    code: 7,
    key: 'calendarTask',
    label: '設問内容',
    kind: 'select',
    default: 'both',
    options: [
      { value: 'both', label: '書き込み＋質問' },
      { value: 'write', label: '書き込みのみ' },
      { value: 'question', label: '質問のみ' },
    ],
    visibleWhen: [{ key: 'subMode', equals: 'calendar' }],
  },
  {
    code: 8,
    key: 'dayStartHour',
    label: '開始時刻',
    kind: 'int',
    min: 8,
    max: 10,
    step: 1,
    default: 9,
    visibleWhen: [{ key: 'subMode', equals: 'timetable' }],
  },
  {
    code: 9,
    key: 'dayEndHour',
    label: '終了時刻',
    kind: 'int',
    min: 15,
    max: 18,
    step: 1,
    default: 17,
    visibleWhen: [{ key: 'subMode', equals: 'timetable' }],
  },
  {
    code: 10,
    key: 'errandCount',
    label: '用事の件数',
    kind: 'int',
    min: 3,
    max: 6,
    step: 1,
    default: 4,
    visibleWhen: [{ key: 'subMode', equals: 'timetable' }],
  },
  {
    code: 11,
    key: 'includeTravel',
    label: '移動時間を考慮',
    kind: 'bool',
    default: true,
    visibleWhen: [{ key: 'subMode', equals: 'timetable' }],
  },
  {
    code: 12,
    key: 'constraintLevel',
    label: '制約の難易度',
    kind: 'select',
    default: 'normal',
    options: [
      { value: 'normal', label: 'ふつう' },
      { value: 'easy', label: 'やさしい' },
      { value: 'hard', label: 'むずかしい' },
    ],
    visibleWhen: [{ key: 'subMode', equals: 'timetable' }],
  },
];

export const m11ScheduleModule: TaskModule<M11Params> = {
  id: 'M11',
  domain: 'iadl',
  title: 'スケジュール・カレンダー',
  shortTitle: 'カレンダー',
  description: '月間カレンダーの予定記入・質問応答、および1日の逆算タイムスケジュール立案課題',
  paramSchema: m11ParamSchema,
  orientation: () => 'portrait',
  generate: (ctx: GenerateContext, params): GenerateResult => {
    const fullParams = params as M11Params & CommonParams;
    return renderM11(ctx, fullParams);
  },
};

export const m11Module: AnyTaskModule = defineModule(m11ScheduleModule);
