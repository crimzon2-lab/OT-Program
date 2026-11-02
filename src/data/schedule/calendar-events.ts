/**
 * カレンダー予定テンプレート（20件以上収録・省略なし）
 * ARCHITECTURE.md §9.6, §10 準拠
 */

import type { CalendarEventTemplate } from '../../types/schema';

/**
 * カレンダー予定テンプレート
 * shortLabel は全角4文字以内（Array.from(shortLabel).length <= 4）
 */
export const CALENDAR_EVENT_TEMPLATES: readonly CalendarEventTemplate[] = [
  {
    id: 'ce-001',
    label: '外来リハビリ',
    shortLabel: 'リハビリ',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [1, 2, 4, 5], // 月・火・木・金
  },
  {
    id: 'ce-002',
    label: '歯科受診',
    shortLabel: '歯科',
    kinds: ['nthWeekday', 'relativeDays', 'specificDate'],
    weekdays: [1, 2, 3, 5, 6],
  },
  {
    id: 'ce-003',
    label: '資源ごみの日',
    shortLabel: '資源ごみ',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [2, 4], // 火・木
  },
  {
    id: 'ce-004',
    label: '燃えないごみの日',
    shortLabel: '不燃ごみ',
    kinds: ['nthWeekday', 'lastWeekday'],
    weekdays: [3], // 水
  },
  {
    id: 'ce-005',
    label: '町内会清掃',
    shortLabel: '町内清掃',
    kinds: ['nthWeekday', 'lastWeekday'],
    weekdays: [0, 6], // 土・日
  },
  {
    id: 'ce-006',
    label: '理容室予約',
    shortLabel: '理容室',
    kinds: ['relativeDays', 'specificDate'],
    weekdays: [2, 3, 4, 5, 6],
  },
  {
    id: 'ce-007',
    label: '図書館返却日',
    shortLabel: '図書返却',
    kinds: ['relativeDays', 'specificDate'],
  },
  {
    id: 'ce-008',
    label: '体操教室',
    shortLabel: '体操教室',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [1, 3], // 月・水
  },
  {
    id: 'ce-009',
    label: '訪問看護',
    shortLabel: '訪問看護',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [2, 5], // 火・金
  },
  {
    id: 'ce-010',
    label: '内科定期受診',
    shortLabel: '内科受診',
    kinds: ['nthWeekday', 'relativeDays', 'specificDate'],
    weekdays: [1, 3, 5],
  },
  {
    id: 'ce-011',
    label: '眼科受診',
    shortLabel: '眼科',
    kinds: ['nthWeekday', 'relativeDays', 'specificDate'],
    weekdays: [2, 4],
  },
  {
    id: 'ce-012',
    label: 'デイケア',
    shortLabel: 'デイケア',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [1, 4], // 月・木
  },
  {
    id: 'ce-013',
    label: 'グラウンドゴルフ',
    shortLabel: 'ゴルフ',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [2, 6], // 火・土
  },
  {
    id: 'ce-014',
    label: '老人クラブ定例会',
    shortLabel: '定例会',
    kinds: ['nthWeekday', 'lastWeekday'],
    weekdays: [3], // 水
  },
  {
    id: 'ce-015',
    label: '手芸サークル',
    shortLabel: '手芸',
    kinds: ['nthWeekday', 'relativeDays'],
    weekdays: [4], // 木
  },
  {
    id: 'ce-016',
    label: 'コーラス練習',
    shortLabel: 'コーラス',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [5], // 金
  },
  {
    id: 'ce-017',
    label: '将棋サークル',
    shortLabel: '将棋会',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [6], // 土
  },
  {
    id: 'ce-018',
    label: '健康相談会',
    shortLabel: '健康相談',
    kinds: ['nthWeekday', 'lastWeekday'],
    weekdays: [1, 3],
  },
  {
    id: 'ce-019',
    label: '配食サービス',
    shortLabel: '配食',
    kinds: ['weekly'],
    weekdays: [1, 3, 5], // 月・水・金
  },
  {
    id: 'ce-020',
    label: '移動図書館',
    shortLabel: '移動図書',
    kinds: ['nthWeekday', 'relativeDays'],
    weekdays: [2, 4],
  },
  {
    id: 'ce-021',
    label: '花壇の水やり当番',
    shortLabel: '花壇当番',
    kinds: ['weekly', 'relativeDays'],
    weekdays: [0, 3],
  },
  {
    id: 'ce-022',
    label: '自治会役員会',
    shortLabel: '役員会',
    kinds: ['nthWeekday', 'lastWeekday'],
    weekdays: [6, 0],
  },
  {
    id: 'ce-023',
    label: '入浴サービス',
    shortLabel: '入浴',
    kinds: ['weekly', 'nthWeekday'],
    weekdays: [2, 5],
  },
  {
    id: 'ce-024',
    label: '散髪予約',
    shortLabel: '散髪',
    kinds: ['relativeDays', 'specificDate'],
    weekdays: [2, 4, 6],
  },
];
