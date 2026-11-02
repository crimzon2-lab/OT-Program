import type { SymbolDef } from '../types/schema';
import type { Rng } from '../utils/prng';

/**
 * 抹消課題（M01）および符号変換課題（M03）用 幾何学記号マスターデータ
 *
 * 設計基準:
 * - viewBox: "0 0 10 10"（中心 (5, 5)）
 * - 座標範囲: 原則 1.4〜8.6 内に収め、strokeScale 最大300% でも線癒着・外枠はみ出しを防ぐ。
 * - SDMT（getSdmtSymbols）用は数字 1〜9 や文字 O, X, + 等と誤読しない明確な幾何学形状を選定。
 * - 先頭9種は互いにシルエットが大きく異なる代表形状を配置する。
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

  // ---- 抹消・SDMT 両用：第1群（先頭12種はすべて異なる形状ファミリーの代表） ----
  {
    id: 'sym-star',
    name: '星形',
    path: 'M 5 1.5 L 6.1 3.7 L 8.5 4.1 L 6.8 5.7 L 7.2 8.2 L 5 7 L 2.8 8.2 L 3.2 5.7 L 1.5 4.1 L 3.9 3.7 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-triangle-up',
    name: '上向き三角',
    path: 'M 5 1.5 L 8.5 8.5 L 1.5 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-heart',
    name: 'ハート',
    path: 'M 5 8.4 L 2 5.2 A 1.8 1.8 0 0 1 5 3.1 A 1.8 1.8 0 0 1 8 5.2 Z',
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
    id: 'sym-arrow-right',
    name: '右矢印',
    path: 'M 8.5 5 L 5 1.5 L 5 3.5 L 1.5 3.5 L 1.5 6.5 L 5 6.5 L 5 8.5 Z',
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
    id: 'sym-crescent',
    name: '三日月',
    path: 'M 5 1.5 A 3.5 3.5 0 0 1 5 8.5 A 2.5 2.5 0 0 0 5 1.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-t-shape',
    name: 'T字型',
    path: 'M 1.6 2 L 8.4 2 L 8.4 4.2 L 6.1 4.2 L 6.1 8.4 L 3.9 8.4 L 3.9 4.2 L 1.6 4.2 Z',
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
    id: 'sym-diamond',
    name: 'ひし形',
    path: 'M 5 1.5 L 8.5 5 L 5 8.5 L 1.5 5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-l-shape',
    name: 'L字型',
    path: 'M 2 1.8 L 4.4 1.8 L 4.4 6 L 8.2 6 L 8.2 8.2 L 2 8.2 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-lightning',
    name: '稲妻型',
    path: 'M 5.8 1.5 L 2.2 5.4 L 4.8 5.4 L 4.2 8.5 L 7.8 4.6 L 5.2 4.6 Z',
    filled: false,
    usage: 'both',
  },

  // ---- 抹消・SDMT 両用：第2群（バリエーション記号） ----
  {
    id: 'sym-teardrop',
    name: 'しずく型',
    path: 'M 5 1.5 L 7.8 5.5 A 2.8 2.8 0 1 1 2.2 5.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-flag',
    name: '旗型',
    path: 'M 2.2 1.5 L 8.4 3.5 L 3.5 5.4 L 3.5 8.5 L 2.2 8.5 Z',
    filled: false,
    usage: 'both',
  },
  {
    id: 'sym-trapezoid',
    name: '台形',
    path: 'M 3.2 2.2 L 6.8 2.2 L 8.6 8.2 L 1.4 8.2 Z',
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
    id: 'sym-arrow-left',
    name: '左矢印',
    path: 'M 1.5 5 L 5 1.5 L 5 3.5 L 8.5 3.5 L 8.5 6.5 L 5 6.5 L 5 8.5 Z',
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
    id: 'sym-diamond-filled',
    name: '黒ひし形',
    path: 'M 5 1.5 L 8.5 5 L 5 8.5 L 1.5 5 Z',
    filled: true,
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
    id: 'sym-pentagon',
    name: '五角形',
    path: 'M 5 1.5 L 8.6 4.1 L 7.2 8.5 L 2.8 8.5 L 1.4 4.1 Z',
    filled: false,
    usage: 'sdmt',
  },
];

/**
 * 視覚的に類似した記号同士が同じシートで同時に選ばれないようにするための形状ファミリー定義。
 * 各ファミリーから最大1個のみを抽出することで、三角ばかり・ひし形ばかり・五角形と六角形の混在を防ぐ。
 */
export const SDMT_SYMBOL_FAMILIES: readonly (readonly string[])[] = [
  ['sym-star'],
  ['sym-triangle-up', 'sym-triangle-down', 'sym-triangle-filled'],
  ['sym-heart', 'sym-teardrop'],
  ['sym-u-shape'],
  ['sym-arrow-right', 'sym-arrow-up', 'sym-arrow-down', 'sym-arrow-left'],
  ['sym-hourglass', 'sym-bow-tie'],
  ['sym-crescent'],
  ['sym-t-shape', 'sym-flag'],
  ['sym-semicircle-up', 'sym-semicircle-down'],
  ['sym-diamond', 'sym-diamond-filled', 'sym-hexagon', 'sym-pentagon', 'sym-trapezoid'],
  ['sym-l-shape'],
  ['sym-lightning'],
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

/**
 * 符号変換課題（M03）用に、互いに形が似ていない `count` 個の記号を選定する。
 * - `shuffle === false` の場合は `getSdmtSymbols().slice(0, count)`（先頭はすべて異なるファミリー）を返す。
 * - `shuffle === true` の場合は異なる形状ファミリーから1つずつランダムに抽出しシャッフルして返す。
 */
export function selectDistinctSdmtSymbols(
  rng: Rng,
  count: number,
  shuffle: boolean,
): SymbolDef[] {
  const pool = getSdmtSymbols();
  if (!shuffle) {
    return pool.slice(0, count);
  }

  const byId = new Map(pool.map((s) => [s.id, s]));
  const chosenFamilies = rng.sample(SDMT_SYMBOL_FAMILIES, Math.min(count, SDMT_SYMBOL_FAMILIES.length));
  const picked: SymbolDef[] = [];

  for (const fam of chosenFamilies) {
    const candidates = fam.map((id) => byId.get(id)).filter((s): s is SymbolDef => s !== undefined);
    if (candidates.length > 0) {
      picked.push(rng.pick(candidates));
    }
  }

  return rng.shuffle(picked);
}
