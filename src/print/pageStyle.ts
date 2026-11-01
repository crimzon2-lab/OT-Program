/**
 * 動的 @page 制御
 * ARCHITECTURE.md §3.5 準拠
 */

import type { Orientation } from '../types/schema';

/**
 * 指定された用紙の向きに対応する @page CSS ルール文字列を生成する
 */
export function buildPageSizeCss(o: Orientation): string {
  return `@page { size: A4 ${o}; margin: 0; }`;
}

/**
 * ドキュメントの @page スタイルを用紙の向きに合わせて動的に切り替える。
 * Node 環境（DOM 非存在環境）では例外をスローせず安全に no-op 終了する。
 * document.head 内に <style id="page-size"> が無ければ新規作成して追加する。
 */
export function setPageOrientation(o: Orientation): void {
  if (typeof document === 'undefined') {
    return;
  }

  let el = document.getElementById('page-size') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'page-size';
    if (document.head) {
      document.head.appendChild(el);
    } else {
      document.documentElement.appendChild(el);
    }
  }

  const css = buildPageSizeCss(o);
  if (el.textContent !== css) {
    el.textContent = css;
  }
}
