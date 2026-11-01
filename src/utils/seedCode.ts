/**
 * 条件・シードコード（RP1 形式・差分エンコード＆パース）
 * ARCHITECTURE.md §4 準拠
 */

import { getDefaultParams, getFullSchema, valuesEqual } from '../core/params';
import {
  CROCKFORD_ALPHABET,
  MODULE_IDS,
  SEED_CODE_VERSION,
  type AnyTaskModule,
  type ModuleId,
  type ParamValue,
  type ParamValues,
  type SeedCodeParseResult,
} from '../types/schema';
import { bitWidth, BitReader, BitWriter, groupByHyphen } from './base32';
import { deriveSeed, UINT32_MAX } from './prng';

/**
 * モジュール、基本シード、シート番号、パラメータから条件・シードコード文字列を生成する。
 * ARCHITECTURE.md §4.1〜§4.2 準拠
 */
export function encodeSeedCode(
  module: Pick<AnyTaskModule, 'id' | 'paramSchema'>,
  seed: number,
  sheetIndex: number,
  params: ParamValues,
): string {
  const fullSchema = getFullSchema(module);
  const defaults = getDefaultParams(module);

  // 1) 既定値と異なるフィールドのみを code 昇順に抽出
  const diffFields = fullSchema
    .filter((f) => !valuesEqual(params[f.key], defaults[f.key]))
    .sort((a, b) => a.code - b.code);

  const prefix = `${SEED_CODE_VERSION}-${module.id}-${seed >>> 0}`;
  const sheetPart = sheetIndex >= 2 ? `-${sheetIndex}` : '';

  if (diffFields.length === 0) {
    return `${prefix}${sheetPart}`;
  }

  // 2) 差分フィールドを BitWriter に書き込み
  const writer = new BitWriter();
  for (const field of diffFields) {
    // code を 5bit
    writer.write(field.code, 5);
    const val = params[field.key];

    switch (field.kind) {
      case 'int': {
        const num = typeof val === 'number' ? val : Number(val);
        const idx = Math.round((num - field.min) / field.step);
        const maxIdx = Math.floor((field.max - field.min) / field.step);
        const bits = bitWidth(maxIdx);
        writer.write(idx, bits);
        break;
      }
      case 'select': {
        const idx = field.options.findIndex((opt) => opt.value === val);
        const maxIdx = field.options.length - 1;
        const bits = bitWidth(maxIdx);
        writer.write(Math.max(0, idx), bits);
        break;
      }
      case 'bool': {
        // 差分＝既定の反転なので値ビット不要 (0 bit)
        break;
      }
      case 'multi': {
        const arr = Array.isArray(val) ? val : [];
        const set = new Set(arr);
        for (const opt of field.options) {
          writer.write(set.has(opt.value) ? 1 : 0, 1);
        }
        break;
      }
      case 'charSet': {
        const str = typeof val === 'string' ? val : '';
        const chars = Array.from(str.normalize('NFC'));
        // 個数 3bit
        writer.write(chars.length, 3);
        const maxCharIdx = field.alphabet.length - 1;
        const charBits = bitWidth(maxCharIdx);
        for (const ch of chars) {
          const idx = field.alphabet.indexOf(ch);
          writer.write(Math.max(0, idx), charBits);
        }
        break;
      }
    }
  }

  // 3) 5bit 単位で Crockford 文字列化
  const rawDataChars = writer.toCrockford();

  // 4) (len + 1) % 4 === 0 になるまで末尾を '0' 埋め（チェック文字1文字と合わせて4の倍数長にする）
  let paddedDataChars = rawDataChars;
  while ((paddedDataChars.length + 1) % 4 !== 0) {
    paddedDataChars += '0';
  }

  // 5) チェック文字算出: deriveSeed('RP1', moduleId, seed >>> 0, sheetIndex, paddedDataChars) % 32
  const checkHash = deriveSeed(
    SEED_CODE_VERSION,
    module.id,
    seed >>> 0,
    sheetIndex,
    paddedDataChars,
  );
  const check = CROCKFORD_ALPHABET[checkHash % 32];

  // 6) 4文字ごとに '-' で区切る
  const fullPayload = `${paddedDataChars}${check}`;
  const groupedPayload = groupByHyphen(fullPayload, 4);

  return `${prefix}${sheetPart}-${groupedPayload}`;
}

/**
 * 条件・シードコード文字列をパース・検証し、復元結果を返す。
 * ARCHITECTURE.md §4.3 準拠
 */
export function parseSeedCode(
  input: string,
  getModule: (id: ModuleId) => Pick<AnyTaskModule, 'id' | 'paramSchema'> | undefined,
): SeedCodeParseResult {
  // 1) 入力正規化: NFKC, 大文字化, 日本語IME長音・全角ハイフン・ダッシュ類を半角 '-' に置換, 空白除去
  const normalized = input
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[ー－‐―−–—]/g, '-')
    .replace(/\s+/g, '');

  const segments = normalized.split('-').filter((x) => x.length > 0);
  if (segments.length < 3) {
    return {
      ok: false,
      error: 'FORMAT',
      message: 'シードコードの形式が不正です（セグメントが不足しています）',
    };
  }

  // 2) バージョン検証
  if (segments[0] !== SEED_CODE_VERSION) {
    return {
      ok: false,
      error: 'VERSION',
      message: `未対応のバージョンです（${SEED_CODE_VERSION} のみ対応）`,
    };
  }

  // 3) モジュール検証
  const rawMid = segments[1]!;
  if (!MODULE_IDS.includes(rawMid as ModuleId)) {
    return {
      ok: false,
      error: 'MODULE',
      message: `不明なモジュールIDです: ${rawMid}`,
    };
  }
  const moduleId = rawMid as ModuleId;
  const mod = getModule(moduleId);
  if (!mod) {
    return {
      ok: false,
      error: 'MODULE',
      message: `モジュールが見つかりません: ${moduleId}`,
    };
  }

  // 4) シード値検証
  const seedStr = segments[2]!;
  if (!/^\d{1,10}$/.test(seedStr)) {
    return {
      ok: false,
      error: 'SEED',
      message: 'シード値は 1〜10 桁の数値である必要があります',
    };
  }
  const seedNum = Number(seedStr);
  if (seedNum < 0 || seedNum > UINT32_MAX) {
    return {
      ok: false,
      error: 'SEED',
      message: `シード値が範囲外です (0..${UINT32_MAX})`,
    };
  }

  // 5) シート番号およびペイロードの判定
  let sheetIndex = 1;
  let payloadSegmentsStart = 3;

  const seg3 = segments[3];
  if (seg3 && /^\d{1,3}$/.test(seg3)) {
    sheetIndex = Number(seg3);
    if (sheetIndex < 1 || sheetIndex > 999) {
      return {
        ok: false,
        error: 'SHEET',
        message: 'シート番号が範囲外です (1..999)',
      };
    }
    payloadSegmentsStart = 4;
  }

  const payloadSegments = segments.slice(payloadSegmentsStart);
  if (payloadSegments.length === 0) {
    return {
      ok: true,
      value: {
        version: SEED_CODE_VERSION,
        moduleId,
        seed: seedNum,
        sheetIndex,
        paramsDiff: {},
      },
    };
  }

  // 6) ペイロード検証（各セグメントは長さ4）
  if (payloadSegments.some((seg) => seg.length !== 4)) {
    return {
      ok: false,
      error: 'FORMAT',
      message: '条件コードのセグメント長が不正です（各4文字必要です）',
    };
  }

  const rawPayload = payloadSegments.join('');
  const cleanedPayload = rawPayload.replace(/O/g, '0').replace(/[IL]/g, '1');

  // 不正文字チェック
  for (let i = 0; i < cleanedPayload.length; i++) {
    const ch = cleanedPayload[i]!;
    if (!CROCKFORD_ALPHABET.includes(ch)) {
      return {
        ok: false,
        error: 'CHAR',
        message: `Base32 に含まれない文字 '${ch}' があります`,
      };
    }
  }

  const paddedDataChars = cleanedPayload.slice(0, -1);
  const checkChar = cleanedPayload.slice(-1);

  // 7) チェックサム検証
  const expectedHash = deriveSeed(
    SEED_CODE_VERSION,
    moduleId,
    seedNum >>> 0,
    sheetIndex,
    paddedDataChars,
  );
  const expectedCheckChar = CROCKFORD_ALPHABET[expectedHash % 32];
  if (checkChar !== expectedCheckChar) {
    return {
      ok: false,
      error: 'CHECKSUM',
      message: 'チェック文字が一致しません（入力ミスの可能性があります）',
    };
  }

  // 8) ビットストリームデコード
  const reader = BitReader.fromCrockford(paddedDataChars);
  if (!reader) {
    return {
      ok: false,
      error: 'CHAR',
      message: 'Base32 デコードに失敗しました',
    };
  }

  const fullSchema = getFullSchema(mod);
  const paramsDiff: Record<string, ParamValue> = {};
  let lastCode = 0;

  try {
    while (reader.remainingBits >= 5) {
      const code = reader.read(5);
      // 0 は終端パディング
      if (code === 0) {
        break;
      }
      if (code <= lastCode) {
        return {
          ok: false,
          error: 'PARAM',
          message: 'コード番号が昇順でないか重複しています',
        };
      }
      lastCode = code;

      const field = fullSchema.find((f) => f.code === code);
      if (!field) {
        return {
          ok: false,
          error: 'PARAM',
          message: `未定義のパラメータコード (${code}) です`,
        };
      }

      switch (field.kind) {
        case 'int': {
          const maxIdx = Math.floor((field.max - field.min) / field.step);
          const bits = bitWidth(maxIdx);
          if (reader.remainingBits < bits) {
            return { ok: false, error: 'PARAM', message: 'ビット列が不足しています' };
          }
          const idx = reader.read(bits);
          const val = field.min + idx * field.step;
          if (val > field.max) {
            return { ok: false, error: 'PARAM', message: 'int 値が許容範囲を超えています' };
          }
          paramsDiff[field.key] = val;
          break;
        }

        case 'select': {
          const maxIdx = field.options.length - 1;
          const bits = bitWidth(maxIdx);
          if (reader.remainingBits < bits) {
            return { ok: false, error: 'PARAM', message: 'ビット列が不足しています' };
          }
          const idx = reader.read(bits);
          if (idx >= field.options.length) {
            return { ok: false, error: 'PARAM', message: 'select インデックスが範囲外です' };
          }
          paramsDiff[field.key] = field.options[idx]!.value;
          break;
        }

        case 'bool': {
          paramsDiff[field.key] = !field.default;
          break;
        }

        case 'multi': {
          const bits = field.options.length;
          if (reader.remainingBits < bits) {
            return { ok: false, error: 'PARAM', message: 'ビット列が不足しています' };
          }
          const chosen: string[] = [];
          for (let j = 0; j < bits; j++) {
            const bit = reader.read(1);
            if (bit === 1) {
              chosen.push(field.options[j]!.value);
            }
          }
          paramsDiff[field.key] = chosen;
          break;
        }

        case 'charSet': {
          if (reader.remainingBits < 3) {
            return { ok: false, error: 'PARAM', message: 'charSet 文字数が不足しています' };
          }
          const count = reader.read(3);
          const maxCharIdx = field.alphabet.length - 1;
          const charBits = bitWidth(maxCharIdx);
          if (reader.remainingBits < count * charBits) {
            return { ok: false, error: 'PARAM', message: 'charSet ビット列が不足しています' };
          }
          const chars: string[] = [];
          for (let j = 0; j < count; j++) {
            const idx = reader.read(charBits);
            if (idx >= field.alphabet.length) {
              return { ok: false, error: 'PARAM', message: 'charSet インデックスが範囲外です' };
            }
            chars.push(field.alphabet[idx]!);
          }
          paramsDiff[field.key] = chars.join('');
          break;
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: 'PARAM',
      message: err instanceof Error ? err.message : 'パラメータデコードエラー',
    };
  }

  return {
    ok: true,
    value: {
      version: SEED_CODE_VERSION,
      moduleId,
      seed: seedNum,
      sheetIndex,
      paramsDiff,
    },
  };
}
