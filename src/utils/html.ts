/**
 * HTML 文字列エスケープ・数値書式化ユーティリティ
 * ARCHITECTURE.md §0, §11.2 準拠
 */

const ESCAPE_MAP: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_REGEX = /[&<>"']/g;

/**
 * 特殊文字5種 (&, <, >, ", ') をエスケープする
 */
export function esc(str: string): string {
  return str.replace(ESCAPE_REGEX, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/**
 * 小数第2位で四捨五入し、末尾の不要な 0 と . を除去した文字列を返す。
 * -0 は '0' とする。非有限数は例外を投げる。
 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError(`Expected finite number, got ${n}`);
  }
  const rounded = Math.round(n * 100) / 100;
  if (Object.is(rounded, -0) || rounded === 0) {
    return '0';
  }
  return rounded.toString();
}

/**
 * mm 単位の文字列（例: '186mm'）を返す
 */
export function mm(n: number): string {
  return `${fmt(n)}mm`;
}

/**
 * 属性マップから HTML/SVG 属性文字列を生成する。
 * undefined と false は除外、true は属性名のみ、数値は fmt(v)、文字列は esc(v) で key="val" 形式に連結。
 */
export function attrs(
  map: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(map)) {
    if (val === undefined || val === false) {
      continue;
    }
    if (val === true) {
      parts.push(key);
    } else if (typeof val === 'number') {
      parts.push(`${key}="${fmt(val)}"`);
    } else {
      parts.push(`${key}="${esc(String(val))}"`);
    }
  }
  return parts.join(' ');
}
