/**
 * 服薬管理マスターデータ（架空薬剤24種以上・省略なし）
 * ARCHITECTURE.md §5.6, §9.7 準拠
 * ※実在の医薬品名（商品名・一般名）は一切含みません。
 */

import type { MedicineTemplate } from '../types/schema';

export const MEDICINE_TEMPLATES: readonly MedicineTemplate[] = [
  // --- 循環器系（血圧・血液・コレステロール） ---
  {
    id: 'md-001',
    fictionalName: 'ケツアール',
    effect: '血圧を下げる薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-002',
    fictionalName: 'アツサール',
    effect: '血圧を安定させる薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-003',
    fictionalName: 'コレスノン',
    effect: 'コレステロールを下げる薬',
    form: 'カプセル',
    timingPatterns: [
      ['evening'],
      ['morning'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-004',
    fictionalName: 'シシスール',
    effect: '中性脂肪を下げる薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning', 'evening'],
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-005',
    fictionalName: 'ノウサララ',
    effect: '血液をサラサラにする薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
      ['morning', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-006',
    fictionalName: 'ケッカンノン',
    effect: '血管を広げる薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },

  // --- 代謝・内分泌系（血糖・尿酸） ---
  {
    id: 'md-007',
    fictionalName: 'トウサール',
    effect: '血糖値を下げる薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-008',
    fictionalName: 'グルコカット',
    effect: '糖の吸収を抑える薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-009',
    fictionalName: 'ニョウサンノン',
    effect: '尿酸値を下げる薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
    ],
    doseOptions: [1],
  },

  // --- 消化器系（胃腸・便通） ---
  {
    id: 'md-010',
    fictionalName: 'イマモール',
    effect: '胃の粘膜を守る薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-011',
    fictionalName: 'イベンテン',
    effect: '胃酸を抑える薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning'],
      ['evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-012',
    fictionalName: 'チョウラック',
    effect: '腸の調子を整える薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-013',
    fictionalName: 'ベンデルン',
    effect: 'お通じを良くする薬',
    form: '錠',
    timingPatterns: [
      ['bedtime'],
      ['evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-014',
    fictionalName: 'カンゾラック',
    effect: '肝臓の働きを助ける薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },

  // --- 鎮痛・消炎・筋骨格系 ---
  {
    id: 'md-015',
    fictionalName: 'イタミノン',
    effect: '痛みを和らげる薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-016',
    fictionalName: 'ツウラクール',
    effect: '関節の痛みを抑える薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-017',
    fictionalName: 'ホネツヨール',
    effect: '骨を丈夫にする薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-018',
    fictionalName: 'カルシンタ',
    effect: 'カルシウムを補う薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-019',
    fictionalName: 'ハルラキシン',
    effect: '筋肉のこわばりをほぐす薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
      ['bedtime'],
    ],
    doseOptions: [1],
  },

  // --- 睡眠・中枢・精神系 ---
  {
    id: 'md-020',
    fictionalName: 'ネムリード',
    effect: '眠りを助ける薬',
    form: '錠',
    timingPatterns: [
      ['bedtime'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-021',
    fictionalName: 'スミンネル',
    effect: '寝つきを良くする薬',
    form: '錠',
    timingPatterns: [
      ['bedtime'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-022',
    fictionalName: 'アンシノン',
    effect: '気持ちを落ち着かせる薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
      ['bedtime'],
    ],
    doseOptions: [1],
  },

  // --- 呼吸器・アレルギー・ビタミン系 ---
  {
    id: 'md-023',
    fictionalName: 'セキトマール',
    effect: '咳を鎮める薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-024',
    fictionalName: 'キョタンリン',
    effect: '痰を出しやすくする薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-025',
    fictionalName: 'ハナスッキリ',
    effect: 'アレルギー性鼻炎を抑える薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
      ['bedtime'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-026',
    fictionalName: 'ビタミナール',
    effect: 'ビタミンを補う薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning'],
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
];
