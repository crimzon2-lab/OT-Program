/**
 * 共通パラメータ定義・デフォルト値生成・バリデーション・表示条件判定
 * ARCHITECTURE.md §4.2, §8 準拠
 */

import {
  COMMON_PARAM_CODES,
  type AnyParamField,
  type AnyTaskModule,
  type GenWarning,
  type IntField,
  type ParamPrimitive,
  type ParamValue,
  type ParamValues,
} from '../types/schema';

/**
 * 全モジュール共通パラメータフィールド定義
 */
export const COMMON_PARAM_FIELDS: readonly [IntField<'textScale'>, IntField<'strokeScale'>] = [
  {
    key: 'textScale',
    code: COMMON_PARAM_CODES.textScale,
    kind: 'int',
    label: '文字倍率',
    min: 80,
    max: 200,
    step: 10,
    default: 100,
    unit: '%',
  },
  {
    key: 'strokeScale',
    code: COMMON_PARAM_CODES.strokeScale,
    kind: 'int',
    label: '線幅倍率',
    min: 100,
    max: 300,
    step: 25,
    default: 100,
    unit: '%',
  },
] as const;

/**
 * モジュールの paramSchema に共通パラメータ COMMON_PARAM_FIELDS を連結した完全スキーマを返す
 */
export function getFullSchema(
  module: Pick<AnyTaskModule, 'paramSchema'>,
): readonly AnyParamField[] {
  return [...module.paramSchema, ...COMMON_PARAM_FIELDS];
}

/**
 * 完全スキーマからすべてのフィールドの既定値オブジェクトを生成する
 */
export function getDefaultParams(
  module: Pick<AnyTaskModule, 'paramSchema'>,
): ParamValues {
  const schema = getFullSchema(module);
  const result: Record<string, ParamValue> = {};
  for (const field of schema) {
    result[field.key] = field.default;
  }
  return result;
}

/**
 * パラメータ値の等価判定を行う。
 * 配列（multi）は順序によらず要素集合として等価判定を行う。
 */
export function valuesEqual(
  a: ParamValue | undefined,
  b: ParamValue | undefined,
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  }

  return false;
}

/**
 * 不正値や範囲外のパラメータを補正（クランプ・丸め・既定値フォールバック）する。
 * 補正が行われた場合は PARAM_CLAMPED 警告を追加する。
 */
export function sanitizeParams(
  module: Pick<AnyTaskModule, 'paramSchema'>,
  raw: Partial<ParamValues>,
): { params: ParamValues; warnings: GenWarning[] } {
  const schema = getFullSchema(module);
  const params: Record<string, ParamValue> = {};
  const warnings: GenWarning[] = [];

  for (const field of schema) {
    const rawVal = raw[field.key];

    switch (field.kind) {
      case 'int': {
        const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
        let finalVal: number;
        if (!Number.isFinite(num)) {
          finalVal = field.default;
          warnings.push({
            code: 'PARAM_CLAMPED',
            message: `${field.label} の値が無効だったため既定値 (${field.default}) に戻しました`,
          });
        } else {
          // 1) 範囲内に clamp
          const clamped = Math.max(field.min, Math.min(field.max, num));
          // 2) step 単位に丸め
          let rounded = field.min + Math.round((clamped - field.min) / field.step) * field.step;
          // 3) 最終クランプ（丸めによる max 超過や min 未満の防止）
          rounded = Math.max(field.min, Math.min(field.max, rounded));
          finalVal = rounded;
          if (rawVal !== finalVal) {
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} を ${rawVal ?? '未設定'} から ${finalVal} に調整しました`,
            });
          }
        }
        params[field.key] = finalVal;
        break;
      }

      case 'select': {
        const valid = field.options.some((opt) => opt.value === rawVal);
        if (valid && typeof rawVal === 'string') {
          params[field.key] = rawVal;
        } else {
          params[field.key] = field.default;
          if (rawVal !== undefined && rawVal !== field.default) {
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} の選択値が無効だったため既定値に戻しました`,
            });
          }
        }
        break;
      }

      case 'bool': {
        params[field.key] = rawVal === undefined ? field.default : Boolean(rawVal);
        break;
      }

      case 'multi': {
        const arr = Array.isArray(rawVal) ? rawVal : undefined;
        if (!arr) {
          params[field.key] = [...field.default];
          if (rawVal !== undefined) {
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} の形式が不正だったため既定値に戻しました`,
            });
          }
        } else {
          // 有効な選択肢のみを抽出し重複排除
          const validSet = new Set(arr.filter((v): v is string => typeof v === 'string'));
          // options の定義順に並べる
          const normalized = field.options
            .map((opt) => opt.value)
            .filter((v) => validSet.has(v));

          if (normalized.length < field.minSelected) {
            params[field.key] = [...field.default];
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} の選択数が最小値 (${field.minSelected}) 未満だったため既定値に戻しました`,
            });
          } else {
            params[field.key] = normalized;
            if (!valuesEqual(arr, normalized)) {
              warnings.push({
                code: 'PARAM_CLAMPED',
                message: `${field.label} の無効値・重複を整理しました`,
              });
            }
          }
        }
        break;
      }

      case 'charSet': {
        if (typeof rawVal !== 'string') {
          params[field.key] = field.default;
          if (rawVal !== undefined) {
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} の形式が不正だったため既定値に戻しました`,
            });
          }
        } else {
          const norm = rawVal.normalize('NFC');
          const chars = Array.from(norm);
          // alphabet に含まれる文字のみ抽出し重複排除
          const uniqueChars = Array.from(new Set(chars.filter((ch) => field.alphabet.includes(ch))));
          // alphabet の出現順にソート
          uniqueChars.sort((a, b) => field.alphabet.indexOf(a) - field.alphabet.indexOf(b));
          // maxCount まで切り詰め
          const trimmed = uniqueChars.slice(0, field.maxCount).join('');

          if (Array.from(trimmed).length < field.minCount) {
            params[field.key] = field.default;
            warnings.push({
              code: 'PARAM_CLAMPED',
              message: `${field.label} の文字数が最小 (${field.minCount}) 未満だったため既定値に戻しました`,
            });
          } else {
            params[field.key] = trimmed;
            if (rawVal !== trimmed) {
              warnings.push({
                code: 'PARAM_CLAMPED',
                message: `${field.label} の文字を定義順に正規化しました`,
              });
            }
          }
        }
        break;
      }
    }
  }

  return { params, warnings };
}

/**
 * フィールドの表示条件 (visibleWhen) を評価する。
 * すべての条件を満たす (AND) 場合は true を返す。
 */
export function isFieldVisible(
  field: AnyParamField,
  params: ParamValues,
): boolean {
  if (!field.visibleWhen || field.visibleWhen.length === 0) {
    return true;
  }

  for (const cond of field.visibleWhen) {
    const currentVal = params[cond.key];
    if (Array.isArray(cond.equals)) {
      if (!cond.equals.includes(currentVal as ParamPrimitive)) {
        return false;
      }
    } else {
      if (currentVal !== cond.equals) {
        return false;
      }
    }
  }

  return true;
}
