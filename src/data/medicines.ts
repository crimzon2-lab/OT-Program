/**
 * 服薬管理マスターデータ（一般名・成分名ベース 26種・省略なし）
 * ARCHITECTURE.md §5.6, §9.7 準拠
 * ※特定の製薬メーカーの商標（商品名）は使用せず、一般名（薬品名・成分名）を使用します。
 */

import type { MedicineTemplate } from '../types/schema';

export const MEDICINE_TEMPLATES: readonly MedicineTemplate[] = [
  // --- 循環器系（血圧・血液・コレステロール） ---
  {
    id: 'md-001',
    fictionalName: 'アムロジピン',
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
    fictionalName: 'ニフェジピン',
    effect: '血圧を安定させる薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-003',
    fictionalName: 'プラバスタチン',
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
    fictionalName: 'ベザフィブラート',
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
    fictionalName: 'クロピドグレル',
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
    fictionalName: 'ジルチアゼム',
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
    fictionalName: 'メトホルミン',
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
    fictionalName: 'ボグリボース',
    effect: '糖の吸収を抑える薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-009',
    fictionalName: 'アロプリノール',
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
    fictionalName: 'レバミピド',
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
    fictionalName: 'ファモチジン',
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
    fictionalName: 'トリメブチン',
    effect: '腸の調子を整える薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-013',
    fictionalName: 'センノシド',
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
    fictionalName: 'グルタチオン',
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
    fictionalName: 'ロキソプロフェン',
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
    fictionalName: 'セレコキシブ',
    effect: '関節の痛みを抑える薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-017',
    fictionalName: 'アレンドロン',
    effect: '骨を丈夫にする薬',
    form: '錠',
    timingPatterns: [
      ['morning'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-018',
    fictionalName: 'カルシトール',
    effect: 'カルシウムを補う薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-019',
    fictionalName: 'エペリゾン',
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
    fictionalName: 'ゾルピデム',
    effect: '眠りを助ける薬',
    form: '錠',
    timingPatterns: [
      ['bedtime'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-021',
    fictionalName: 'ブロチゾラム',
    effect: '寝つきを良くする薬',
    form: '錠',
    timingPatterns: [
      ['bedtime'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-022',
    fictionalName: 'タンドスピロン',
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
    fictionalName: 'チペピジン',
    effect: '咳を鎮める薬',
    form: '錠',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1, 2],
  },
  {
    id: 'md-024',
    fictionalName: 'カルボシステイン',
    effect: '痰を出しやすくする薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning', 'noon', 'evening'],
    ],
    doseOptions: [1],
  },
  {
    id: 'md-025',
    fictionalName: 'エピナスチン',
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
    fictionalName: 'メコバラミン',
    effect: 'ビタミンを補う薬',
    form: 'カプセル',
    timingPatterns: [
      ['morning'],
      ['morning', 'evening'],
    ],
    doseOptions: [1, 2],
  },
];
