import type { SymbolDef } from '../types/schema';

/**
 * 抹消課題（M01）および符号変換課題（M03）用 幾何学記号マスターデータ
 *
 * 設計基準:
 * - viewBox: "0 0 10 10"（中心 (5, 5)）
 * - 座標範囲: 原則 1.4〜8.6 内に収め、strokeScale 最大300% でも線癒着・外枠はみ出しを防ぐ。
 * - SDMT（getSdmtSymbols）用は数字 1〜9 や文字 O, X, + 等と誤読しない明確な幾何学形状を選定。
 */
export const SYMBOLS: readonly SymbolDef[] = [
  // ---- 抹消専用（数字・文字と誤読しやすいため SDMT 除外） ----
  {
    id: 'sym-circle',
    name: '白丸',
    path: 'M 5 1.5 A 3.5 3.5 0 1 0 5 8.5 A 3.5 3.5 0 1 0 5 1.5 Z',
    filled: false,
    usage: 'cancellation',
  },
  {
    id: 'sym-disc',
    name: '黒丸',
    path: 'M 5 1.5 A 3.5 3.5 0 1 0 5 8.5 A 3.5 3.5 0 1 0 5 1.5 Z',
    filled: true,
    usage: 'cancellation',
  },
  {
    id: 'sym-square',
    name: '正方形',
    path: 'M 2 2 L 8 2 L 8 8 L 2 8 Z',
    filled: false,
    usage: 'cancellation',
  },
  {
    id: 'sym-square-filled',
    name: '黒四角',
    path: 'M 2 2 L 8 2 L 8 8 L 2 8 Z',
    filled: true,
    usage: 'cancellation',
  },
  {
    id: 'sym-cross',
    name: '十字',
    path: 'M 4 1.5 L 6 1.5 L 6 4 L 8.5 4 L 8.5 6 L 6 6 L 6 8.5 L 4 8.5 L 4 6 L 1.5 6 L 1.5 4 L 4 4 Z',
    filled: false,
    usage: 'cancellation',
  },
  {
    id: 'sym-x',
    name: 'バツ',
    path: 'M 3 1.5 L 5 3.5 L 7 1.5 L 8.5 3 L 6.5 5 L 8.5 7 L 7 8.5 L 5 6.5 L 3 8.5 L 1.5 7 L 3.5 5 L 1.5 3 Z',
    filled: false,
    usage: 'cancellation',
  },

  // ---- 抹消・SDMT 両用（数字 1〜9 や文字 O, X, + と明確に弁別可能な図形） ----
  {
    id: 'sym-triangle-up',
    name: '上向き三角',
    path: 'M 5 1.5 L 8.5 8.5 L 1.5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-triangle-down',
    name: '下向き三角',
    path: 'M 1.5 1.5 L 8.5 1.5 L 5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-triangle-filled',
    name: '黒三角',
    path: 'M 5 1.5 L 8.5 8.5 L 1.5 8.5 Z',
    filled: true,
    usage: 'both',
  },
  {
    id: 'sym-diamond',
    name: 'ひし形',
    path: 'M 5 1.5 L 8.5 5 L 5 8.5 L 1.5 5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-diamond-filled',
    name: '黒ひし形',
    path: 'M 5 1.5 L 8.5 5 L 5 8.5 L 1.5 5 Z',
    filled: true,
    usage: 'both',
  },
  {
    id: 'sym-pentagon',
    name: '五角形',
    path: 'M 5 1.5 L 8.6 4.1 L 7.2 8.5 L 2.8 8.5 L 1.4 4.1 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-hexagon',
    name: '六角形',
    path: 'M 5 1.5 L 8.5 3.5 L 8.5 6.5 L 5 8.5 L 1.5 6.5 L 1.5 3.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-star',
    name: '星形',
    path: 'M 5 1.5 L 6.1 3.7 L 8.5 4.1 L 6.8 5.7 L 7.2 8.2 L 5 7 L 2.8 8.2 L 3.2 5.7 L 1.5 4.1 L 3.9 3.7 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-hourglass',
    name: '砂時計',
    path: 'M 1.5 1.5 L 8.5 1.5 L 1.5 8.5 L 8.5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-bow-tie',
    name: '蝶ネクタイ',
    path: 'M 1.5 1.5 L 1.5 8.5 L 8.5 1.5 L 8.5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-semicircle-up',
    name: '上向き半円',
    path: 'M 1.5 7.5 A 3.5 3.5 0 0 1 8.5 7.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-semicircle-down',
    name: '下向き半円',
    path: 'M 1.5 2.5 L 8.5 2.5 A 3.5 3.5 0 0 1 1.5 2.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-arrow-up',
    name: '上矢印',
    path: 'M 5 1.5 L 8.5 5 L 6.5 5 L 6.5 8.5 L 3.5 8.5 L 3.5 5 L 1.5 5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-arrow-down',
    name: '下矢印',
    path: 'M 3.5 1.5 L 6.5 1.5 L 6.5 5 L 8.5 5 L 5 8.5 L 1.5 5 L 3.5 5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-arrow-right',
    name: '右矢印',
    path: 'M 8.5 5 L 5 1.5 L 5 3.5 L 1.5 3.5 L 1.5 6.5 L 5 6.5 L 5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-arrow-left',
    name: '左矢印',
    path: 'M 1.5 5 L 5 1.5 L 5 3.5 L 8.5 3.5 L 8.5 6.5 L 5 6.5 L 5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-u-shape',
    name: 'コの字型',
    path: 'M 2 2 L 4 2 L 4 6 L 6 6 L 6 2 L 8 2 L 8 8 L 2 8 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-crescent',
    name: '三日月',
    path: 'M 5 1.5 A 3.5 3.5 0 0 1 5 8.5 A 2.5 2.5 0 0 0 5 1.5 Z',
    filled: false,
    usage: 'both',
  },
];

/**
 * 抹消課題（M01）で使用可能な記号リスト（usage が 'cancellation' または 'both'）を取得する。
 */
export function getCancellationSymbols(): readonly SymbolDef[] {
  return SYMBOLS.filter((s) => s.usage === 'cancellation' || s.usage === 'both');
}

/**
 * 符号変換課題（M03 / SDMT）で使用可能な記号リスト（usage が 'sdmt' または 'both'）を取得する。
 * 数字 1〜9 や文字 O, X, + と誤認しにくい幾何学図形のみで構成される。
 */
export function getSdmtSymbols(): readonly SymbolDef[] {
  return SYMBOLS.filter((s) => s.usage === 'sdmt' || s.usage === 'both');
}
