/**
 * スケジュール用マスターデータ（用事テンプレート・順序ペア）
 * ARCHITECTURE.md §9.6, §10 準拠
 */

import type { ErrandTemplate, OrderPairTemplate } from '../../types/schema';

/**
 * 用事テンプレート（30件以上収録・省略なし）
 * すべての openFromMin・openToMin・durationsMin は 30 の倍数
 */
export const ERRAND_TEMPLATES: readonly ErrandTemplate[] = [
  // --- 予約系 (appointment: 4件以上) ---
  {
    id: 'er-001',
    label: '歯科受診',
    place: '歯科医院',
    kind: 'appointment',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-002',
    label: '内科受診',
    place: '内科クリニック',
    kind: 'appointment',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-003',
    label: '美容院予約',
    place: '美容院',
    kind: 'appointment',
    durationsMin: [60],
    openFromMin: 570,  // 9:30
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-004',
    label: 'リハビリ予約',
    place: 'リハビリ施設',
    kind: 'appointment',
    durationsMin: [60],
    openFromMin: 540,  // 9:00
    openToMin: 960,    // 16:00
    travelMin: 30,
  },

  // --- 食事系 (meal: 2件以上) ---
  {
    id: 'er-005',
    label: '喫茶店で昼食',
    place: '喫茶店',
    kind: 'meal',
    durationsMin: [30, 60],
    openFromMin: 660,  // 11:00
    openToMin: 840,    // 14:00
    travelMin: 30,
  },
  {
    id: 'er-006',
    label: 'うどん屋で昼食',
    place: 'うどん屋',
    kind: 'meal',
    durationsMin: [30, 60],
    openFromMin: 660,  // 11:00
    openToMin: 840,    // 14:00
    travelMin: 30,
  },
  {
    id: 'er-007',
    label: '自宅で昼食',
    place: '自宅',
    kind: 'meal',
    durationsMin: [30, 60],
    openFromMin: 690,  // 11:30
    openToMin: 810,    // 13:30
    travelMin: 0,
  },

  // --- 用事・買い物系 (errand: 24件以上) ---
  {
    id: 'er-008',
    label: '銀行でお金をおろす',
    place: '銀行',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 900,    // 15:00
    travelMin: 30,
  },
  {
    id: 'er-009',
    label: 'スーパーで買い物をする',
    place: 'スーパー',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-010',
    label: '調剤薬局で薬を受け取る',
    place: '調剤薬局',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-011',
    label: '図書館で本を借りる',
    place: '図書館',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 570,  // 9:30
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-012',
    label: '喫茶店で読書をする',
    place: '喫茶店',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-013',
    label: '郵便局で手紙を出す',
    place: '郵便局',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-014',
    label: '市役所で証明書を取る',
    place: '市役所',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-015',
    label: 'ドラッグストアで日用品を買う',
    place: 'ドラッグストア',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-016',
    label: 'クリーニング店に服を出す',
    place: 'クリーニング店',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-017',
    label: '書店で雑誌を探す',
    place: '書店',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 600,  // 10:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-018',
    label: '100円ショップで文房具を買う',
    place: '100円ショップ',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 600,  // 10:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-019',
    label: 'パン屋で朝食用のパンを買う',
    place: 'パン屋',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-020',
    label: '公園を散歩する',
    place: '公園',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 480,  // 8:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-021',
    label: '花屋で鉢植えを見る',
    place: '花屋',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 570,  // 9:30
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-022',
    label: '和菓子屋でお茶菓子を買う',
    place: '和菓子屋',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 570,  // 9:30
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-023',
    label: '八百屋で野菜を買う',
    place: '八百屋',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-024',
    label: '魚屋で魚を買う',
    place: '魚屋',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-025',
    label: 'ホームセンターで日用品を見る',
    place: 'ホームセンター',
    kind: 'errand',
    durationsMin: [30, 60],
    openFromMin: 540,  // 9:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-026',
    label: '自宅で洗濯物を取り込む',
    place: '自宅',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 480,  // 8:00
    openToMin: 1080,   // 18:00
    travelMin: 0,
  },
  {
    id: 'er-027',
    label: '自宅で庭の水やりをする',
    place: '自宅',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 480,  // 8:00
    openToMin: 1080,   // 18:00
    travelMin: 0,
  },
  {
    id: 'er-028',
    label: '地域センターで回覧板を届ける',
    place: '地域センター',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 540,  // 9:00
    openToMin: 1020,   // 17:00
    travelMin: 30,
  },
  {
    id: 'er-029',
    label: 'メガネ店で調整してもらう',
    place: 'メガネ店',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 600,  // 10:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-030',
    label: '家電量販店で電球を買う',
    place: '家電量販店',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 600,  // 10:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-031',
    label: 'コンビニで公共料金を払う',
    place: 'コンビニ',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 480,  // 8:00
    openToMin: 1080,   // 18:00
    travelMin: 30,
  },
  {
    id: 'er-032',
    label: '自宅で体操をする',
    place: '自宅',
    kind: 'errand',
    durationsMin: [30],
    openFromMin: 480,  // 8:00
    openToMin: 1080,   // 18:00
    travelMin: 0,
  },
];

/**
 * 順序制約テンプレート（12件以上収録・省略なし）
 * beforeId と afterId は ERRAND_TEMPLATES に存在する ID
 */
export const ORDER_PAIR_TEMPLATES: readonly OrderPairTemplate[] = [
  {
    id: 'op-001',
    beforeId: 'er-008', // 銀行
    afterId: 'er-009',  // スーパー
    reason: 'お金をおろしてから買い物をする',
  },
  {
    id: 'op-002',
    beforeId: 'er-002', // 内科受診
    afterId: 'er-010',  // 調剤薬局
    reason: '内科を受診してから薬を受け取る',
  },
  {
    id: 'op-003',
    beforeId: 'er-011', // 図書館
    afterId: 'er-012',  // 喫茶店読書
    reason: '本を借りてから喫茶店で読書をする',
  },
  {
    id: 'op-004',
    beforeId: 'er-014', // 市役所
    afterId: 'er-013',  // 郵便局
    reason: '証明書を取ってから郵便局で郵送する',
  },
  {
    id: 'op-005',
    beforeId: 'er-001', // 歯科
    afterId: 'er-005',  // 喫茶店昼食
    reason: '歯科受診のあとに昼食をとる',
  },
  {
    id: 'op-006',
    beforeId: 'er-020', // 公園散歩
    afterId: 'er-005',  // 喫茶店昼食
    reason: '散歩のあとに喫茶店で昼食をとる',
  },
  {
    id: 'op-007',
    beforeId: 'er-017', // 書店
    afterId: 'er-005',  // 喫茶店昼食
    reason: '本を探してから昼食をとる',
  },
  {
    id: 'op-008',
    beforeId: 'er-008', // 銀行
    afterId: 'er-025',  // ホームセンター
    reason: 'お金をおろしてからホームセンターで買い物をする',
  },
  {
    id: 'op-009',
    beforeId: 'er-004', // リハビリ
    afterId: 'er-006',  // うどん屋昼食
    reason: 'リハビリのあとにうどん屋で昼食をとる',
  },
  {
    id: 'op-010',
    beforeId: 'er-023', // 八百屋
    afterId: 'er-024',  // 魚屋
    reason: '八百屋のあとに魚屋で食材を買う',
  },
  {
    id: 'op-011',
    beforeId: 'er-018', // 100円ショップ
    afterId: 'er-009',  // スーパー
    reason: '文房具を買ってからスーパーに行く',
  },
  {
    id: 'op-012',
    beforeId: 'er-008', // 銀行
    afterId: 'er-031',  // コンビニ
    reason: 'お金をおろしてから公共料金を支払う',
  },
  {
    id: 'op-013',
    beforeId: 'er-019', // パン屋
    afterId: 'er-007',  // 自宅昼食
    reason: 'パンを買ってから自宅で昼食をとる',
  },
  {
    id: 'op-014',
    beforeId: 'er-022', // 和菓子屋
    afterId: 'er-007',  // 自宅昼食
    reason: '和菓子を買ってから自宅に戻る',
  },
];
