/**
 * ============================================================================
 *  reha-print : 共通契約スキーマ（CONTRACT LOCK / 原則変更禁止）
 * ============================================================================
 *  全12モジュール・UI・印刷基盤・マスターデータが準拠する型と定数を定義する。
 *
 *  【後続実装者への厳守事項】
 *   1. 本ファイルを編集してはならない。型が足りない場合はモジュール内部
 *      （例：src/modules/.../logic.ts）でローカル型を定義すること。
 *   2. どうしても契約変更が必要な場合は作業を止め、TASKS.md 冒頭の
 *      「契約変更リクエスト」書式で理由・影響範囲を報告すること。
 *   3. ParamField.code と定数テーブル（HIRAGANA_SEION 等）の並び順は
 *      シードコードの互換性に直結する。追加は末尾のみ・既存値の変更禁止。
 * ============================================================================
 */

import type { Rng } from '../utils/prng';

/* ==========================================================================
 * 1. 基本識別子
 * ========================================================================== */

export type ModuleId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06'
  | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12';

export const MODULE_IDS: readonly ModuleId[] = [
  'M01', 'M02', 'M03', 'M04', 'M05', 'M06',
  'M07', 'M08', 'M09', 'M10', 'M11', 'M12',
];

export type DomainId = 'attention' | 'visuospatial' | 'memory' | 'language' | 'iadl';

export const DOMAIN_ORDER: readonly DomainId[] = [
  'attention', 'visuospatial', 'memory', 'language', 'iadl',
];

export const DOMAIN_LABELS: Readonly<Record<DomainId, string>> = {
  attention: 'A. 注意・情報処理',
  visuospatial: 'B. 視空間認知・USN',
  memory: 'C. ワーキングメモリ・計算',
  language: 'D. 失語・言語機能',
  iadl: 'E. 遂行機能・IADL',
};

/** 用紙の向き。1 印刷ジョブ = 1 方向（ARCHITECTURE.md §3） */
export type Orientation = 'portrait' | 'landscape';

/**
 * ページの役割。
 *  - problem : 患者用問題用紙。ヘッダーに 実施日/氏名・ID/所要時間/メモ・スコア 欄を出す。
 *  - stimulus: 提示用シート（例：M06B 空間記憶の見本）。記入欄を出さず副題のみ。
 *  - answer  : 検者用 解答・採点シート。
 */
export type PageRole = 'problem' | 'stimulus' | 'answer';

/** 出力モード：問題用紙のみ / 問題用紙＋解答用紙 */
export type OutputMode = 'problemOnly' | 'withAnswer';

/**
 * バッチ時の解答用紙の並べ方。
 *  - grouped    : 問題1..N → 解答1..N（患者に問題をまとめて渡しやすい）
 *  - interleaved: 問題1 → 解答1 → 問題2 → 解答2 ...
 */
export type AnswerOrder = 'grouped' | 'interleaved';

/* ==========================================================================
 * 2. 用紙ジオメトリ・タイポグラフィ・解答スタイル（単位はすべて mm）
 * ========================================================================== */

export const PAGE_GEOMETRY = {
  /** A4 実寸 */
  paper: {
    portrait: { widthMm: 210, heightMm: 297 },
    landscape: { widthMm: 297, heightMm: 210 },
  },
  /**
   * .sheet 要素の高さを実寸より短くする量。
   * 丸め誤差で 1px はみ出して白紙ページが混入するのを防ぐ（ARCHITECTURE.md §3.4）。
   */
  sheetHeightSafetyMm: 0.5,
  /** 用紙内側の安全余白（四辺共通） */
  marginMm: 12,
  /** ヘッダー帯（タイトル・記入欄・条件シードコード） */
  headerMm: 18,
  /** 教示文帯（instruction が無いページでも高さは確保して本文座標系を固定） */
  instructionMm: 12,
  /** フッター帯（50mm 校正バー・ページ番号） */
  footerMm: 5,
} as const;

export interface BodyBox {
  readonly widthMm: number;
  readonly heightMm: number;
}

/**
 * 本文（PageBody.markup）に使える領域。SVG の viewBox はこの値と一致させる。
 *  portrait : 幅 210-24=186, 高さ (297-0.5)-24-18-12-5 = 237.5 → 237
 *  landscape: 幅 297-24=273, 高さ (210-0.5)-24-18-12-5 = 150.5 → 150
 */
export const BODY_BOX: Readonly<Record<Orientation, BodyBox>> = {
  portrait: { widthMm: 186, heightMm: 237 },
  landscape: { widthMm: 273, heightMm: 150 },
};

export const TYPOGRAPHY = {
  fontFamily:
    "'BIZ UDPGothic','BIZ UDPゴシック','Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif",
  /** 本文の基準文字サイズ（≒12.8pt）。textScale(%) を掛けて使う */
  baseFontMm: 4.5,
  headerTitleMm: 5,
  headerFieldMm: 3.5,
  /** 条件・シードコードの印字サイズ（小さく） */
  codeFontMm: 2.6,
  instructionFontMm: 4.2,
  /** 基準線幅。strokeScale(%) を掛けて使う */
  baseStrokeMm: 0.35,
  /** 1pt = 0.3528mm */
  ptToMm: 0.3528,
  inkColor: '#000000',
  /** 薄い補助線（ドットグリッドの枠など）に使ってよい唯一のグレー */
  subInkColor: '#555555',
} as const;

/**
 * 解答用紙のハイライト規則（ARCHITECTURE.md §6）。
 *  - 線系（TMT経路・迷路最短路）：赤 + 破線 + 太線 の三重符号化。
 *  - 文字・記号系（抹消・仮名拾い等）：文字色は inkColor（黒）のまま、
 *    外周を赤の太線丸 / 太枠で囲む。正解文字そのものを赤で塗る・赤文字にするのは禁止
 *    （白黒印刷で薄くなるため）。
 */
export const ANSWER_STYLE = {
  color: '#D00000',
  /** 文字・記号を囲む丸／枠の線幅 */
  markStrokeMm: 0.6,
  /** 丸の半径 = 文字サイズ × markRadiusRatio + markPaddingMm */
  markRadiusRatio: 0.5,
  markPaddingMm: 0.8,
  /** 経路線（TMT・迷路） */
  pathStrokeMm: 0.9,
  pathDashArray: '3 1.5',
  /** 線分二等分の中点・誤差スケール */
  scaleStrokeMm: 0.3,
} as const;

/** 印刷倍率確認用の校正バー長さ（フッターに描画） */
export const CALIBRATION_BAR_MM = 50;

/* ==========================================================================
 * 3. パラメータスキーマ（UI 自動生成 + シードコード差分エンコードの基礎）
 * ========================================================================== */

export type ParamPrimitive = number | boolean | string;
/** multi フィールドのみ string[] */
export type ParamValue = ParamPrimitive | readonly string[];
export type ParamValues = Readonly<Record<string, ParamValue>>;

/**
 * 全モジュール共通パラメータ。core/params.ts の COMMON_PARAM_FIELDS で定義され、
 * 各モジュールの paramSchema には含めない（core が自動的に連結する）。
 */
export type CommonParams = {
  /** 文字倍率（%）80〜200, step 10, 既定 100 */
  textScale: number;
  /** 線幅倍率（%）100〜300, step 25, 既定 100 */
  strokeScale: number;
};

/** 共通パラメータ用に予約されたコード番号 */
export const COMMON_PARAM_CODES = { textScale: 30, strokeScale: 31 } as const;
/** モジュール固有パラメータに使えるコード番号の範囲 1..29 */
export const MODULE_PARAM_CODE_MIN = 1;
export const MODULE_PARAM_CODE_MAX = 29;

/** 表示条件：key の現在値が equals（配列ならいずれか）に一致するとき表示 */
export interface VisibleWhen {
  readonly key: string;
  readonly equals: ParamPrimitive | readonly ParamPrimitive[];
}

interface ParamFieldBase<K extends string> {
  readonly key: K;
  /**
   * シードコード用の不変番号（1..29）。モジュール内で一意。
   * 一度リリースしたら変更・再利用禁止。新パラメータは未使用番号を割り当てる。
   */
  readonly code: number;
  readonly label: string;
  readonly help?: string;
  /** すべて満たすとき表示（AND）。非表示でも値は保持・エンコード対象 */
  readonly visibleWhen?: readonly VisibleWhen[];
}

export interface IntField<K extends string = string> extends ParamFieldBase<K> {
  readonly kind: 'int';
  readonly min: number;
  readonly max: number;
  /** min からの刻み。値は min + n*step に丸める */
  readonly step: number;
  readonly default: number;
  readonly unit?: string;
}

export interface SelectOption<V extends string = string> {
  readonly value: V;
  readonly label: string;
}

export interface SelectField<K extends string = string, V extends string = string>
  extends ParamFieldBase<K> {
  readonly kind: 'select';
  /** 並び順はシードコードに影響する（インデックスでエンコード）。末尾追加のみ可 */
  readonly options: readonly SelectOption<V>[];
  readonly default: V;
}

export interface BoolField<K extends string = string> extends ParamFieldBase<K> {
  readonly kind: 'bool';
  readonly default: boolean;
}

export interface MultiField<K extends string = string> extends ParamFieldBase<K> {
  readonly kind: 'multi';
  /** 最大 32 個。並び順はビットマスクの順序 */
  readonly options: readonly SelectOption[];
  readonly default: readonly string[];
  readonly minSelected: number;
}

/**
 * 文字集合入力（例：仮名拾いの任意ターゲット文字）。
 * 値は alphabet に含まれる重複のない文字を連結した文字列（alphabet 順に正規化）。
 */
export interface CharSetField<K extends string = string> extends ParamFieldBase<K> {
  readonly kind: 'charSet';
  /** 最大 64 文字。インデックスでエンコードするため変更禁止（HIRAGANA_SEION 等の定数を使う） */
  readonly alphabet: string;
  readonly default: string;
  readonly minCount: number;
  /** 最大 7 */
  readonly maxCount: number;
}

export type AnyParamField = IntField | SelectField | BoolField | MultiField | CharSetField;

/** P の各キーの値型から適切なフィールド型を導出する */
type FieldFor<K extends string, V> = [V] extends [number]
  ? IntField<K>
  : [V] extends [boolean]
    ? BoolField<K>
    : [V] extends [readonly string[]]
      ? MultiField<K>
      : [V] extends [string]
        ? string extends V
          ? CharSetField<K> | SelectField<K, string>
          : SelectField<K, V>
        : never;

export type ParamField<P> = {
  [K in keyof P & string]: FieldFor<K, P[K]>;
}[keyof P & string];

/** モジュール固有パラメータのスキーマ。P の全キーを 1 回ずつ含めること */
export type ParamSchema<P> = readonly ParamField<P>[];

/* ==========================================================================
 * 4. モジュール別パラメータ型（全12モジュール）
 *    ※ type エイリアスで定義（interface だと ParamValues に代入できないため）
 *    ※ 各フィールドの範囲・既定値は ARCHITECTURE.md §8 のパラメータ表に従う
 * ========================================================================== */

/** M01 抹消課題 */
export type M01Params = {
  stimulusType: 'hiragana' | 'katakana' | 'digit' | 'latin' | 'shape';
  /** ターゲットの種類数 1..3 */
  targetKinds: number;
  layout: 'grid' | 'scatter';
  /** 総刺激数 40..320 step 4（4象限均等のため4の倍数） */
  totalStimuli: number;
  /** ターゲット出現率 % 10..40 step 5 */
  targetRate: number;
  /** 刺激サイズ mm 5..14 */
  charSizeMm: number;
  quadrantBalance: boolean;
  showTargetSample: boolean;
  orientation: Orientation;
};

/** M02 TMT様課題 */
export type M02Params = {
  part: 'A' | 'B';
  /** 10..30 */
  nodeCount: number;
  /** 6..16 */
  nodeDiameterMm: number;
  orientation: Orientation;
  practice: boolean;
};

/** M03 符号変換（SDMT様） */
export type M03Params = {
  /** 6..9 */
  pairCount: number;
  /** 3..10 */
  rows: number;
  /** 8..16 */
  cols: number;
  /** 先頭 N マスを練習枠として強調 0..12 */
  practiceCells: number;
  shuffleMapping: boolean;
};

/** M04 仮名拾い・文章読解二重課題 */
export type M04Params = {
  subMode: 'random' | 'passage';
  targetPreset: 'vowels' | 'custom';
  /** HIRAGANA_SEION の部分集合 1..5 文字 */
  customTargets: string;
  /** 小書き文字（ぁ→あ 等）をターゲットとして数えるか。既定 false */
  includeSmallKana: boolean;
  /** random: 行数 6..20 */
  rows: number;
  /** random: 1行の文字数 15..35 */
  charsPerRow: number;
  /** random: ターゲット出現率 % 10..30 step 5 */
  targetRate: number;
  /** random: ターゲットの濁音・半濁音形（か→が）を妨害刺激として混ぜる */
  dakuonDecoys: boolean;
  /** passage: ベタ組み（スペース除去）/ 分かち書き（スペース維持） */
  spacing: 'solid' | 'wakachi';
  /** passage: 内容確認問題数 2..3 */
  questionCount: number;
  questionPlacement: 'samePage' | 'nextPage';
  /** 文字サイズ mm 4..9 */
  charSizeMm: number;
};

/** M05 線分抹消・線分二等分 */
export type M05Params = {
  subMode: 'cancellation' | 'bisection';
  /** cancellation: 6 区画（左/中/右 × 上/下）あたりの線分数 2..6 */
  linesPerCell: number;
  /** cancellation: 線分長 mm 10..30 */
  lineLengthMm: number;
  /** cancellation: 中央に検者デモ用の練習線（集計対象外）を置く */
  centerPractice: boolean;
  /** bisection: 本数 5..10 */
  bisectCount: number;
  /** bisection: 最短長 mm 100..200 step 10 */
  minLengthMm: number;
  /** bisection: 最長長 mm 100..200 step 10 */
  maxLengthMm: number;
  /** bisection: 中心からの左右オフセット最大 mm 0..50 step 5 */
  maxOffsetMm: number;
  orientation: Orientation;
};

/** M06 点つなぎ図形模写・空間記憶マトリクス */
export type M06Params = {
  subMode: 'dotCopy' | 'spatialMatrix';
  /** dotCopy: N×N ドット 3..6 */
  dotGrid: number;
  /** dotCopy: 図形の線分数 3..12 */
  segmentCount: number;
  allowDiagonal: boolean;
  copyLayout: 'leftRight' | 'topBottom';
  /** dotCopy: 1枚あたりの図形数 1..3 */
  figureCount: number;
  /** spatialMatrix: M×M 3..6 */
  matrixSize: number;
  /** spatialMatrix: 黒塗りセル数 2..12（M*M/2 を上限に clamp） */
  filledCells: number;
  /** spatialMatrix: 1枚あたりのマトリクス数 1..6 */
  matrixCount: number;
  orientation: Orientation;
};

/** M07 連続計算・紙面N-back */
export type M07Params = {
  subMode: 'serialAddition' | 'nBack';
  /** serialAddition: 行数 5..20 */
  additionRows: number;
  /** serialAddition: 1行の数字数 10..30（数字は 3..9） */
  additionDigits: number;
  nBackLevel: '1' | '2';
  nBackItem: 'digit' | 'hiragana' | 'katakana' | 'latin';
  /** nBack: 行数 3..10（各行は独立系列） */
  nBackRows: number;
  /** nBack: 1行の項目数 10..20 */
  nBackLength: number;
  /** nBack: 一致率 % 25..35 */
  matchRate: number;
};

/** M08 語彙・喚語・意味理解・短文 */
export type M08Params = {
  subMode: 'fill' | 'anagram' | 'category' | 'sentence';
  /** VocabCategoryId の部分集合（1 個以上） */
  categories: readonly string[];
  notation: 'kanjiRuby' | 'hiragana' | 'kanji';
  /** 設問数 5..20（レイアウト上限で clamp） */
  itemCount: number;
  fillHint: 'initial' | 'final' | 'initialFinal' | 'random';
  showCategoryHint: boolean;
  /** 語の仮名文字数 下限 2..6（anagram は 3..5 に clamp） */
  minLength: number;
  /** 語の仮名文字数 上限 2..6（anagram は 3..5 に clamp） */
  maxLength: number;
  categoryTask: 'oddOneOut' | 'findAll';
  /** oddOneOut: 1群の語数 4..5 */
  groupSize: number;
  /** findAll: 提示語数 20..30 */
  findAllCount: number;
  sentenceTask: 'particleBlank' | 'particleChoice' | 'judgement';
};

/** M09 迷路 */
export type M09Params = {
  /** 8..25 */
  gridSize: number;
  route: 'tlToBr' | 'trToBl' | 'rightToLeft' | 'leftToRight';
  algorithm: 'backtracker' | 'prim';
  orientation: Orientation;
};

/** M10 金銭管理・買い物計算 */
export type M10Params = {
  subMode: 'coinTotal' | 'payment' | 'shopping';
  /** coinTotal/payment: 問題数 2..6（payment は 4 で clamp） */
  problemCount: number;
  /** coinTotal: 1問の最大枚数 3..12 */
  maxPieces: number;
  includeBills: boolean;
  paymentTask: 'exact' | 'minChange';
  /** payment: 支払額の上限 円 300..10000 step 100 */
  priceMax: number;
  /** shopping: 価格表の品目数 8..15 */
  shopItemCount: number;
  /** shopping: 買い物リストの品目数 2..6 */
  listCount: number;
  shoppingLevel: 'basic' | 'budget' | 'discount';
  includeQuantity: boolean;
};

/** M11 スケジュール調整・カレンダー */
export type M11Params = {
  subMode: 'calendar' | 'timetable';
  calendarSource: 'practice' | 'actual';
  /** actual: 2020..2040 */
  year: number;
  /** actual: 1..12 */
  month: number;
  weekStart: 'sun' | 'mon';
  /** 条件文数 3..6 */
  conditionCount: number;
  calendarTask: 'write' | 'question' | 'both';
  /** timetable: 開始時 8..10 */
  dayStartHour: number;
  /** timetable: 終了時 15..18 */
  dayEndHour: number;
  /** timetable: 用事数 3..6 */
  errandCount: number;
  includeTravel: boolean;
  constraintLevel: 'easy' | 'normal' | 'hard';
};

/** M12 服薬管理・残薬計算 */
export type M12Params = {
  /** 3..6 */
  drugCount: number;
  /** letterEffect: A錠（血圧の薬） / fictionalEffect: ケツアール錠（血圧の薬） / letterOnly: A錠 */
  labelStyle: 'letterEffect' | 'fictionalEffect' | 'letterOnly';
  organizer: 'daily' | 'weekly';
  includeCalc: boolean;
  travelDays: '7' | '14';
  includeStock: boolean;
};

/** ModuleId → パラメータ型 の対応表 */
export type ModuleParamsMap = {
  M01: M01Params; M02: M02Params; M03: M03Params; M04: M04Params;
  M05: M05Params; M06: M06Params; M07: M07Params; M08: M08Params;
  M09: M09Params; M10: M10Params; M11: M11Params; M12: M12Params;
};

/* ==========================================================================
 * 5. 生成コンテキスト・出力
 * ========================================================================== */

export type WarningCode =
  | 'PARAM_CLAMPED'        // パラメータを範囲内に丸めた
  | 'COUNT_ROUNDED'        // 4象限均等化のため個数を丸めた
  | 'PLACEMENT_TRUNCATED'  // 配置試行上限で打ち切り、要素数を減らした
  | 'POOL_EXHAUSTED'       // マスターデータ不足でバッチ内重複が発生した
  | 'LAYOUT_SCALED'        // はみ出し防止のため文字・余白を縮小した
  | 'ITEMS_REDUCED'        // はみ出し防止のため設問数を減らした
  | 'ORIENTATION_FORCED'   // 要件上、用紙の向きを強制した
  | 'GENERATION_RETRY'     // 条件を満たす問題が作れず条件を緩めた
  | 'OVERFLOW_DETECTED';   // プレビューで本文はみ出しを検出（UI 側で付与）

export interface GenWarning {
  readonly code: WarningCode;
  /** 日本語のユーザー向け説明（例：「配置できなかったため総刺激数を 280 → 248 に調整しました」） */
  readonly message: string;
  /** バッチ内の何枚目か（1 始まり）。core が付与 */
  readonly sheetIndex?: number;
}

export interface GenerateContext {
  readonly moduleId: ModuleId;
  /** 基本シード（uint32） */
  readonly seed: number;
  /** バッチ内の何枚目か（1 始まり） */
  readonly sheetIndex: number;
  /**
   * バッチ枚数（表示専用）。生成内容に影響させてはならない
   * （影響させると単独再生成で再現できなくなる）。
   */
  readonly sheetCount: number;
  /** この紙面に印字する条件・シードコード */
  readonly seedCode: string;
  /** createSheetRng(seed, moduleId, sheetIndex) */
  readonly rng: Rng;
  readonly orientation: Orientation;
  /** 本文領域。SVG の viewBox="0 0 widthMm heightMm" とする */
  readonly body: BodyBox;
  /**
   * バッチ横断の非復元抽出（src/utils/pool.ts）。
   * items を poolKey 固有の順序でシャッフルし、(sheetIndex-1)*count から count 個返す。
   * 不足時は先頭に巻き戻して補い POOL_EXHAUSTED を警告する。
   * 同一 generate 内で同じ poolKey を 2 回呼ぶのは禁止（例外を投げる）。
   * items は静的マスターデータを filter した配列とし、順序が決定論的であること。
   */
  draw<T>(poolKey: string, items: readonly T[], count: number): T[];
  /** 警告を記録する */
  warn(code: WarningCode, message: string): void;
}

/** 4象限・3列の集計単位 */
export type Quadrant = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export const QUADRANT_ORDER: readonly Quadrant[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
export const QUADRANT_LABELS: Readonly<Record<Quadrant, string>> = {
  topLeft: '左上', topRight: '右上', bottomLeft: '左下', bottomRight: '右下',
};
export type Column3 = 'left' | 'center' | 'right';

export interface RegionCount {
  /** 正解（ターゲット）数 */
  readonly targets: number;
  /** 総刺激数（ターゲット＋非ターゲット） */
  readonly total: number;
}
/**
 * 象限の判定：要素中心 (x,y) が x < W/2 なら左、y < H/2 なら上。
 * ちょうど中線上は右・下に含める。練習用要素は集計に含めない。
 */
export type QuadrantStats = Readonly<Record<Quadrant, RegionCount>>;
export type ColumnStats = Readonly<Record<Column3, RegionCount>>;

/** 言語・IADL 系の採点チェックリスト項目 */
export interface ChecklistItem {
  readonly id: string;
  /** 例：「銀行は 15:00 までに終えている」 */
  readonly label: string;
  /** 例：模範解答「10:00〜10:30」 */
  readonly expected?: string;
  /** 配点（任意） */
  readonly points?: number;
}

/**
 * 1 ページ分の本文。ヘッダー・教示文・フッターは print/sheet.ts が付与する。
 */
export interface PageBody {
  /** ページの役割（ヘッダーの種類を決める） */
  readonly pageRole: PageRole;
  /**
   * svg : markup は完全な <svg> 要素。width/height を mm 指定し viewBox を body と一致させる。
   * html: markup は本文領域内に挿入される HTML 断片。寸法は mm 指定で固定すること。
   */
  readonly kind: 'svg' | 'html';
  readonly markup: string;
  /** 教示文（プレーンテキスト。sheet がエスケープして教示文帯に表示） */
  readonly instruction?: string;
  /**
   * 副題。例：'【提示用シート】' '【回答シート】' '内容確認問題'。
   * stimulus で省略時は '【提示用シート】'、answer で省略時は '【解答・採点シート（検者用）】'。
   */
  readonly subLabel?: string;
}

export interface GenerateResult {
  /** problem / stimulus を先に、answer を後に並べる（core が outputMode で answer を除外） */
  readonly pages: readonly PageBody[];
  /** 空間系：4象限ごとの正解数（解答用紙に表として描画済みであること） */
  readonly quadrantStats?: QuadrantStats;
  /** 線分抹消など：左・中・右の列ごとの正解数 */
  readonly columnStats?: ColumnStats;
  /** 言語・IADL 系：採点基準（解答用紙に描画済みであること） */
  readonly checklist?: readonly ChecklistItem[];
}

/** 全モジュールが実装する共通インターフェース */
export interface TaskModule<P extends ParamValues> {
  readonly id: ModuleId;
  readonly domain: DomainId;
  /** 紙面タイトル兼 UI 表示名（例：「抹消課題」） */
  readonly title: string;
  /** サイドバー用の短い名前 */
  readonly shortTitle: string;
  /** UI 説明文（臨床的な狙い） */
  readonly description: string;
  /** モジュール固有パラメータ（CommonParams は含めない） */
  readonly paramSchema: ParamSchema<P>;
  /** 用紙の向き（パラメータから決定。サブモードで強制する場合もここで返す） */
  orientation(params: Readonly<P & CommonParams>): Orientation;
  /**
   * 問題生成。純粋関数であること：
   *  - 乱数は ctx.rng（と ctx.draw）のみ。Math.random / Date / DOM 計測は禁止。
   *  - 同じ (seed, sheetIndex, params) なら同じ文字列を返す。
   */
  generate(ctx: GenerateContext, params: Readonly<P & CommonParams>): GenerateResult;
}

/** 型消去したモジュール（レジストリ格納用） */
export interface AnyTaskModule {
  readonly id: ModuleId;
  readonly domain: DomainId;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly paramSchema: readonly AnyParamField[];
  orientation(params: ParamValues): Orientation;
  generate(ctx: GenerateContext, params: ParamValues): GenerateResult;
}

/** 型付きモジュール定義を型消去してレジストリへ渡すためのヘルパー */
export function defineModule<P extends ParamValues>(m: TaskModule<P>): AnyTaskModule {
  return m as unknown as AnyTaskModule;
}

/* ==========================================================================
 * 6. ジョブ（バッチ）・描画済みシート・アプリ状態・プリセット
 * ========================================================================== */

export const BATCH_MIN = 1;
export const BATCH_MAX = 10;

export interface JobRequest {
  readonly moduleId: ModuleId;
  /** CommonParams を含む完全なパラメータ（sanitize 前でも可。core が sanitize する） */
  readonly params: ParamValues;
  readonly seed: number;
  /** 1..10 */
  readonly batchCount: number;
  readonly outputMode: OutputMode;
  readonly answerOrder: AnswerOrder;
  /**
   * バッチの開始シート番号（既定 1）。シードコード「…-3」から 3 枚目だけを
   * 再生成するときに使う。sheetIndex = startSheetIndex .. startSheetIndex+batchCount-1
   */
  readonly startSheetIndex?: number;
}

/** 印刷用に組み立てる 1 ページ（1 枚の A4） */
export interface RenderedPage {
  readonly moduleId: ModuleId;
  readonly title: string;
  readonly orientation: Orientation;
  readonly body: PageBody;
  readonly seedCode: string;
  readonly sheetIndex: number;
  readonly sheetCount: number;
  /** 同一シート（同じ sheetIndex）内でのページ番号 1.. と総数 */
  readonly pageNo: number;
  readonly pageTotal: number;
}

export interface JobResult {
  readonly orientation: Orientation;
  readonly pages: readonly RenderedPage[];
  readonly warnings: readonly GenWarning[];
  /** sanitize 後のパラメータ（UI へ書き戻す） */
  readonly params: ParamValues;
}

export interface AppState {
  readonly moduleId: ModuleId;
  /** モジュールごとの最新パラメータ（切り替えても保持） */
  readonly paramsByModule: Readonly<Partial<Record<ModuleId, ParamValues>>>;
  readonly seed: number;
  readonly batchCount: number;
  readonly outputMode: OutputMode;
  readonly answerOrder: AnswerOrder;
}

export const PRESET_STORAGE_KEY = 'reha-print.presets.v1';
export const APP_STATE_STORAGE_KEY = 'reha-print.state.v1';

export interface Preset {
  /** 'p-' + 作成時刻ベースの一意 ID（Date 使用可：生成ロジックではないため） */
  readonly id: string;
  readonly name: string;
  readonly moduleId: ModuleId;
  /** CommonParams を含む完全なパラメータ */
  readonly params: ParamValues;
  readonly batchCount?: number;
  readonly outputMode?: OutputMode;
  readonly answerOrder?: AnswerOrder;
  /** ISO 8601 */
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PresetStore {
  readonly version: 1;
  readonly presets: readonly Preset[];
}

/** localStorage 互換の最小インターフェース（テストで差し替え可能にする） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/* ==========================================================================
 * 7. 条件・シードコード（ARCHITECTURE.md §4）
 *    形式: RP1-<MID>-<SEED>[-<SHEET>][-<COND1>-<COND2>...]
 *    例  : RP1-M01-482914           （既定条件・1枚目）
 *          RP1-M01-482914-3         （既定条件・3枚目）
 *          RP1-M04-482914-7K3F-Q20T （条件差分あり・1枚目）
 * ========================================================================== */

export const SEED_CODE_VERSION = 'RP1';
/** Crockford's Base32（I, L, O, U を除外） */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 条件コードの区切り長 */
export const COND_GROUP_LENGTH = 4;

export interface ParsedSeedCode {
  readonly version: typeof SEED_CODE_VERSION;
  readonly moduleId: ModuleId;
  readonly seed: number;
  /** 1 始まり。コードにシート番号が無ければ 1 */
  readonly sheetIndex: number;
  /** 既定値と異なるパラメータのみ（CommonParams を含みうる） */
  readonly paramsDiff: ParamValues;
}

export type SeedCodeErrorKind =
  | 'FORMAT'          // 区切り・セグメント構成が不正
  | 'VERSION'         // RP1 以外
  | 'MODULE'          // 未知のモジュール ID
  | 'SEED'            // シードが数値でない / 範囲外
  | 'SHEET'           // シート番号が 1..999 外
  | 'CHAR'            // Crockford 外の文字
  | 'CHECKSUM'        // チェック文字不一致（入力ミス）
  | 'PARAM';          // 未知のコード番号・値域外

export type SeedCodeParseResult =
  | { readonly ok: true; readonly value: ParsedSeedCode }
  | { readonly ok: false; readonly error: SeedCodeErrorKind; readonly message: string };

/* ==========================================================================
 * 8. 日本語文字テーブル（ARCHITECTURE.md §5.4）
 *    並び順はシードコード（charSet のインデックス）に影響するため変更禁止。
 * ========================================================================== */

/** ひらがな清音 46 文字（五十音順） */
export const HIRAGANA_SEION =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
/** ひらがな濁音 21 文字 */
export const HIRAGANA_DAKUON = 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ';
/** ひらがな半濁音 5 文字 */
export const HIRAGANA_HANDAKUON = 'ぱぴぷぺぽ';
/** ひらがな小書き → 対応する清音 */
export const HIRAGANA_SMALL_TO_BASE: Readonly<Record<string, string>> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
  'ゕ': 'か', 'ゖ': 'け',
};
/** 母音ターゲット（仮名拾いの既定） */
export const VOWEL_TARGETS = 'あいうえお';

/** 抹消課題の刺激文字集合（視覚的に紛らわしい文字を除外済み・変更禁止） */
export const STIMULUS_CHARSETS = {
  /** へ（カタカナ「ヘ」と同形）・を・ん・ゐゑ を除く清音 */
  hiragana: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふほまみむめもやゆよらりるれろわ',
  /** ヘ・ヲ・ン・ロ（漢字「口」と同形）・エ（漢字「工」と同形）・ニ（漢字「二」と同形）・カ（漢字「力」と同形）を除く */
  katakana: 'アイウオキクケコサシスセソタチツテトナヌネノハヒフホマミムメモヤユヨラリルレワ',
  digit: '0123456789',
  /** O/0, I/1/l, S/5, Z/2, B/8 などの紛らわしい字形を除く大文字 */
  latin: 'ACDEFGHJKMNPRTUVWXY',
} as const;

export type KanaScript = 'hiragana' | 'katakana' | 'other';
export type KanaVoicing = 'seion' | 'dakuon' | 'handakuon' | 'none';

export interface KanaInfo {
  /** NFC 正規化後の 1 文字 */
  readonly char: string;
  readonly script: KanaScript;
  /** 清音形（が→か, ぱ→は, ぁ→あ, カ→か）。仮名以外は char そのもの */
  readonly base: string;
  readonly voicing: KanaVoicing;
  readonly isSmall: boolean;
}

export interface KanaMatchOptions {
  /** ターゲット清音（例：'あいうえお'） */
  readonly targets: string;
  /** true なら小書き文字（ぁ・っ・ゃ…）を対応清音のターゲットとして数える */
  readonly includeSmall: boolean;
}

/* ==========================================================================
 * 9. マスターデータ スキーマ（src/data/）
 * ========================================================================== */

/** 最低収録件数（データ検証テストで使用） */
export const DATA_MINIMUMS = {
  vocabulary: 240,
  vocabPerCategory: 20,
  passages: 18,
  particleSentences: 60,
  judgementSentences: 60,
  shopItems: 72,
  errands: 30,
  orderPairs: 12,
  calendarEvents: 20,
  medicines: 24,
  cancellationSymbols: 12,
  sdmtSymbols: 9,
} as const;

/* ---- 9.1 語彙 ---- */
export type VocabCategoryId =
  | 'furniture' | 'kitchen' | 'clothing' | 'food' | 'stationery' | 'vehicle'
  | 'body' | 'nature' | 'appliance' | 'animal' | 'plant' | 'place';

export const VOCAB_CATEGORY_IDS: readonly VocabCategoryId[] = [
  'furniture', 'kitchen', 'clothing', 'food', 'stationery', 'vehicle',
  'body', 'nature', 'appliance', 'animal', 'plant', 'place',
];

export interface VocabCategory {
  readonly id: VocabCategoryId;
  /** 例：'台所用品・食器' */
  readonly label: string;
  /** 穴埋めのカテゴリヒント。例：'台所にあるもの' */
  readonly hintPhrase: string;
  /** findAll の教示用。例：'台所で使うもの' →「台所で使うものをすべて探して〇をつけましょう」 */
  readonly findAllPhrase: string;
}

export interface VocabEntry {
  /** '<category>-<3桁連番>' 例：'kitchen-001' */
  readonly id: string;
  readonly category: VocabCategoryId;
  /**
   * 仮名表記。和語・漢語はひらがな、外来語はカタカナ（例：'まないた' 'テレビ'）。
   * 長音「ー」・小書き文字もそれぞれ 1 文字＝1 マスとして数える。
   */
  readonly kana: string;
  /** 一般的な表記（例：'まな板' '冷蔵庫' 'テレビ'）。漢字が無い語は kana と同一 */
  readonly kanji: string;
  /** Array.from(kana).length と一致すること（テストで検証） */
  readonly kanaLength: number;
  /** 意味ヒント（例：'食材を切るときに下に敷く板'） */
  readonly hint: string;
  /** 1: 高頻度・易 / 2: 中 / 3: やや難 */
  readonly difficulty: 1 | 2 | 3;
  /**
   * 他カテゴリにも属しうる場合に列挙（例：トマト food だが plant とも言える）。
   * 仲間外れ課題では、正解（仲間外れ）がこれらを介して群の仲間にならないよう除外判定に使う。
   */
  readonly alsoCategories?: readonly VocabCategoryId[];
}

/* ---- 9.2 短文（助詞・正誤判定） ---- */
export type Particle = 'が' | 'を' | 'に' | 'で' | 'へ' | 'と' | 'から' | 'まで' | 'は' | 'の' | 'より';

export const PARTICLES: readonly Particle[] = ['が', 'を', 'に', 'で', 'へ', 'と', 'から', 'まで', 'は', 'の', 'より'];

export interface ParticleSentence {
  /** 'ps-001' */
  readonly id: string;
  /** 空欄の前。例：'朝ごはん' */
  readonly before: string;
  /** 模範解答の助詞 */
  readonly answer: Particle;
  /** 空欄の後。例：'食べました。' */
  readonly after: string;
  /** answer 以外に正解とみなす助詞（例：に/へ）。無ければ空配列 */
  readonly acceptable: readonly Particle[];
  /** 選択肢形式の誤答 2 個（answer・acceptable と重複しないこと） */
  readonly distractors: readonly [Particle, Particle];
}

export interface JudgementSentence {
  /** 'js-001' */
  readonly id: string;
  readonly text: string;
  /** 意味的に妥当なら true */
  readonly isValid: boolean;
  /** 検者用の根拠（例：'魚は空を飛ばない'） */
  readonly reason: string;
}

/* ---- 9.3 読解コーパス（仮名拾い） ---- */
export type PassageTheme = 'season' | 'lifeTips' | 'episode' | 'food' | 'health' | 'local';

export interface ComprehensionQuestion {
  readonly prompt: string;
  readonly choices: readonly [string, string, string];
  readonly answerIndex: 0 | 1 | 2;
}

export interface Passage {
  /** 'pa-001' */
  readonly id: string;
  readonly theme: PassageTheme;
  readonly title: string;
  /**
   * 分かち書きのひらがな本文。許可文字：ひらがな（U+3041–U+3096）・「ー」・「、」・「。」・半角スペース。
   * 文節間は半角スペース 1 個。スペースを除いた文字数 180〜300。
   */
  readonly kanaText: string;
  /** 内容確認 3 択問題（ちょうど 3 問。questionCount=2 のときは先頭 2 問を使う） */
  readonly questions: readonly [ComprehensionQuestion, ComprehensionQuestion, ComprehensionQuestion];
}

/* ---- 9.4 買い物 ---- */
export type ShopCategory =
  | 'vegetable' | 'fruit' | 'meat' | 'fish' | 'dairy' | 'bread'
  | 'staple' | 'drink' | 'snack' | 'seasoning' | 'frozen' | 'daily';

export interface ShopItem {
  /** 'shop-001' */
  readonly id: string;
  /** 例：'りんご' '牛乳' 'ティッシュペーパー' */
  readonly name: string;
  readonly category: ShopCategory;
  /** 例：'1個' '1本' '1パック' '1袋' '5箱組' */
  readonly unit: string;
  /** 税込価格（円・整数） 10..1500 */
  readonly price: number;
  /** 個数指定（3個など）を出してよい品目か */
  readonly countable: boolean;
}

/* ---- 9.5 お金 ---- */
export type Denomination = 1 | 5 | 10 | 50 | 100 | 500 | 1000 | 5000 | 10000;
export const DENOMINATIONS: readonly Denomination[] = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];
export const COIN_DENOMINATIONS: readonly Denomination[] = [1, 5, 10, 50, 100, 500];
export const BILL_DENOMINATIONS: readonly Denomination[] = [1000, 5000, 10000];

/** 硬貨の実寸（mm）。模式図はこの比率を保って描く */
export const COIN_SPECS: Readonly<Record<1 | 5 | 10 | 50 | 100 | 500, { diameterMm: number; holeMm: number }>> = {
  1: { diameterMm: 20.0, holeMm: 0 },
  5: { diameterMm: 22.0, holeMm: 5.0 },
  10: { diameterMm: 23.5, holeMm: 0 },
  50: { diameterMm: 21.0, holeMm: 4.0 },
  100: { diameterMm: 22.6, holeMm: 0 },
  500: { diameterMm: 26.5, holeMm: 0 },
};

/** 紙幣の実寸（mm）。模式図は BILL_DRAW_SCALE 倍で描く */
export const BILL_SPECS: Readonly<Record<1000 | 5000 | 10000, { widthMm: number; heightMm: number }>> = {
  1000: { widthMm: 150, heightMm: 76 },
  5000: { widthMm: 156, heightMm: 76 },
  10000: { widthMm: 160, heightMm: 76 },
};
export const BILL_DRAW_SCALE = 0.36;

/** 所持金・支払いなどの金種構成（金種 → 枚数） */
export type MoneyCounts = Readonly<Partial<Record<Denomination, number>>>;

/* ---- 9.6 スケジュール・カレンダー ---- */
/** 0=日 … 6=土 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_LABELS: readonly string[] = ['日', '月', '火', '水', '木', '金', '土'];

/** 時刻は「0:00 からの分」で扱う（例：9:30 → 570） */
export type MinuteOfDay = number;

export type ErrandKind = 'errand' | 'meal' | 'appointment';

export interface ErrandTemplate {
  /** 'er-001' */
  readonly id: string;
  /** 例：'銀行でお金をおろす' */
  readonly label: string;
  /** 例：'銀行'（移動判定に使用。同じ place 間は移動時間 0） */
  readonly place: string;
  readonly kind: ErrandKind;
  /** 所要時間の候補（分・30 の倍数） */
  readonly durationsMin: readonly number[];
  /** 利用可能時間帯（営業時間など）。例：銀行 540〜900（9:00〜15:00） */
  readonly openFromMin: MinuteOfDay;
  readonly openToMin: MinuteOfDay;
  /** includeTravel 時、直前の場所が異なる場合に必要な移動時間（分・0 か 30） */
  readonly travelMin: 0 | 30;
}

export interface OrderPairTemplate {
  /** 'op-001' */
  readonly id: string;
  readonly beforeId: string;
  readonly afterId: string;
  /** 例：'お金をおろしてから買い物をする' */
  readonly reason: string;
}

export type CalendarRuleKind = 'weekly' | 'nthWeekday' | 'lastWeekday' | 'relativeDays' | 'specificDate';

export interface CalendarEventTemplate {
  /** 'ce-001' */
  readonly id: string;
  /** 条件文用。例：'リハビリ' '資源ごみの日' */
  readonly label: string;
  /** カレンダーのマスに書く略記（全角 4 文字以内）。例：'リハ' '資源ごみ' */
  readonly shortLabel: string;
  /** このイベントに使ってよい規則 */
  readonly kinds: readonly CalendarRuleKind[];
  /** weekly / nthWeekday / lastWeekday で使ってよい曜日（省略時は月〜金） */
  readonly weekdays?: readonly Weekday[];
}

/* ---- 9.7 服薬 ---- */
export type DoseTiming = 'morning' | 'noon' | 'evening' | 'bedtime';
export const DOSE_TIMINGS: readonly DoseTiming[] = ['morning', 'noon', 'evening', 'bedtime'];
export const DOSE_TIMING_LABELS: Readonly<Record<DoseTiming, string>> = {
  morning: '朝食後', noon: '昼食後', evening: '夕食後', bedtime: '寝る前',
};
/** お薬カレンダーの列見出し（短縮） */
export const DOSE_TIMING_SHORT: Readonly<Record<DoseTiming, string>> = {
  morning: '朝', noon: '昼', evening: '夕', bedtime: '寝る前',
};

export interface MedicineTemplate {
  /** 'md-001' */
  readonly id: string;
  /** 例：'血圧の薬' */
  readonly effect: string;
  /**
   * 架空の薬剤名（カタカナ、「錠」「カプセル」を含まない）。例：'ケツアール'。
   * 実在の医薬品名・商標と一致しないこと（誤認防止）。
   */
  readonly fictionalName: string;
  readonly form: '錠' | 'カプセル';
  /** 使ってよい服用タイミングの組み合わせ候補（例：[['morning'], ['morning','evening']]） */
  readonly timingPatterns: readonly (readonly DoseTiming[])[];
  /** 1 回量の候補 */
  readonly doseOptions: readonly (1 | 2)[];
}

/* ---- 9.8 幾何学記号（抹消課題・符号変換） ---- */
export interface SymbolDef {
  /** 'sym-01' */
  readonly id: string;
  /** 例：'白丸' '黒三角' */
  readonly name: string;
  /**
   * viewBox="0 0 10 10" 内の SVG path データ。線幅は描画側で指定。
   * 文字・数字に見える形（O, X, +, = 等）は sdmt 用に使わない。
   */
  readonly path: string;
  /** true: 塗りつぶし / false: 線のみ */
  readonly filled: boolean;
  readonly usage: 'cancellation' | 'sdmt' | 'both';
}
