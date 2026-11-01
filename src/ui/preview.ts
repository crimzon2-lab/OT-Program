/**
 * A4 プレビュー領域コンポーネント
 * ARCHITECTURE.md §3.3, §7 準拠
 */

import { setPageOrientation } from '../print/pageStyle';
import { renderSheetHtml } from '../print/sheet';
import type { GenWarning, JobResult, Orientation } from '../types/schema';
import { fmt } from '../utils/html';

export interface PreviewOptions {
  readonly viewportElement?: HTMLElement;
  readonly printRootElement?: HTMLElement;
  readonly warningsElement?: HTMLElement;
}

export interface PreviewController {
  readonly viewport: HTMLElement;
  readonly printRoot: HTMLElement;
  readonly warningsContainer: HTMLElement;
  update(result: JobResult | undefined): void;
  setZoom(zoom: number | 'auto'): void;
  autoFitZoom(): void;
}

const PX_PER_MM = 96 / 25.4; // 約 3.7795 px/mm

/**
 * プレビューコントローラを生成する
 */
export function createPreview(opts?: PreviewOptions): PreviewController {
  const viewport =
    opts?.viewportElement ??
    document.getElementById('preview-viewport') ??
    document.createElement('div');
  viewport.id = 'preview-viewport';

  const printRoot =
    opts?.printRootElement ??
    document.getElementById('print-root') ??
    document.createElement('div');
  printRoot.id = 'print-root';
  if (!viewport.contains(printRoot)) {
    viewport.appendChild(printRoot);
  }

  const warningsContainer =
    opts?.warningsElement ??
    document.getElementById('warnings') ??
    document.createElement('div');
  warningsContainer.id = 'warnings';
  warningsContainer.hidden = true;

  let currentOrientation: Orientation = 'portrait';
  let zoomMode: number | 'auto' = 'auto';

  function calculateAutoZoom(): number {
    const widthMm = currentOrientation === 'portrait' ? 210 : 297;
    const clientWidth = viewport.clientWidth;
    if (clientWidth <= 0) {
      return 0.6;
    }
    const availWidth = clientWidth - 32;
    if (availWidth <= 0) {
      return 0.25;
    }
    const targetPx = widthMm * PX_PER_MM;
    const calculated = availWidth / targetPx;
    // 0.25 〜 1.2 に安全にクランプ
    return Math.max(0.25, Math.min(1.2, calculated));
  }

  function applyZoom(): void {
    const zoomVal = zoomMode === 'auto' ? calculateAutoZoom() : zoomMode;
    printRoot.style.setProperty('--zoom', fmt(zoomVal));
  }

  function autoFitZoom(): void {
    zoomMode = 'auto';
    applyZoom();
  }

  function setZoom(zoom: number | 'auto'): void {
    zoomMode = zoom;
    applyZoom();
  }

  function update(result: JobResult | undefined): void {
    printRoot.innerHTML = '';

    if (!result || result.pages.length === 0) {
      setPageOrientation('portrait');
      currentOrientation = 'portrait';
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'preview__empty';
      emptyNotice.textContent =
        '課題モジュールを選択すると、ここに A4 印刷プレビューが表示されます。';
      printRoot.appendChild(emptyNotice);
      warningsContainer.innerHTML = '';
      warningsContainer.hidden = true;
      return;
    }

    currentOrientation = result.orientation;
    setPageOrientation(result.orientation);

    // 1. 各ページを #print-root にレンダリング
    const textScale =
      typeof result.params.textScale === 'number' ? result.params.textScale : 100;

    let fullHtml = '';
    for (const page of result.pages) {
      fullHtml += renderSheetHtml(page, textScale);
    }
    printRoot.innerHTML = fullHtml;

    // 2. ズーム倍率を適用
    applyZoom();

    // 3. はみ出し検出 (OVERFLOW_DETECTED)
    const detectedWarnings: GenWarning[] = [...result.warnings];
    const bodyElements = printRoot.querySelectorAll<HTMLElement>('.sheet__body');

    bodyElements.forEach((bodyEl, idx) => {
      const isOverflowing =
        bodyEl.scrollHeight > bodyEl.clientHeight + 1 ||
        bodyEl.scrollWidth > bodyEl.clientWidth + 1;

      if (isOverflowing) {
        const sheetEl = bodyEl.closest<HTMLElement>('.sheet');
        if (sheetEl) {
          sheetEl.classList.add('is-overflow');
        }
        detectedWarnings.push({
          code: 'OVERFLOW_DETECTED',
          message: `第 ${idx + 1} ページの本文枠ではみ出しを検出しました`,
        });
      }
    });

    // 4. 警告バナー描画
    renderWarnings(detectedWarnings);
  }

  function renderWarnings(warnings: readonly GenWarning[]): void {
    warningsContainer.innerHTML = '';
    if (warnings.length === 0) {
      warningsContainer.hidden = true;
      return;
    }

    warningsContainer.hidden = false;
    for (const w of warnings) {
      const item = document.createElement('div');
      item.className =
        w.code === 'OVERFLOW_DETECTED'
          ? 'warning-item warning-item--overflow'
          : 'warning-item';
      item.textContent = `⚠️ [${w.code}] ${w.message}`;
      warningsContainer.appendChild(item);
    }
  }

  // リサイズ検知
  if (typeof window !== 'undefined') {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (zoomMode === 'auto') {
          applyZoom();
        }
      });
      observer.observe(viewport);
    } else {
      window.addEventListener('resize', () => {
        if (zoomMode === 'auto') {
          applyZoom();
        }
      });
    }
  }

  return {
    viewport,
    printRoot,
    warningsContainer,
    update,
    setZoom,
    autoFitZoom,
  };
}
