/**
 * リハプリント自動生成 エントリポイント
 * ARCHITECTURE.md §1, §2, §7 準拠
 */

import './print/print.css';
import './ui/app.css';

import { runJob } from './core/generator';
import { AppStore } from './ui/appState';
import { createPresetPanel } from './ui/presetPanel';
import { createPreview } from './ui/preview';
import { createSidebar } from './ui/sidebar';
import { createToolbar } from './ui/toolbar';

function bootstrapApp(): void {
  const sidebarEl = document.getElementById('sidebar');
  const toolbarEl = document.getElementById('toolbar');
  const warningsEl = document.getElementById('warnings');
  const viewportEl = document.getElementById('preview-viewport');
  const printRootEl = document.getElementById('print-root');

  if (!sidebarEl || !toolbarEl || !warningsEl || !viewportEl || !printRootEl) {
    return;
  }

  const store = new AppStore();
  const preview = createPreview({
    viewportElement: viewportEl,
    printRootElement: printRootEl,
    warningsElement: warningsEl,
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function flushGeneration(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const currentMod = store.getCurrentModule();
    if (!currentMod) {
      preview.update(undefined);
      return;
    }

    try {
      const jobReq = store.toJobRequest();
      const result = runJob(jobReq, currentMod);
      preview.update(result);
    } catch (err) {
      console.error('Job generation failed:', err);
    }
  }

  function scheduleGeneration(immediate = false): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (immediate) {
      flushGeneration();
    } else {
      debounceTimer = setTimeout(() => {
        flushGeneration();
      }, 200);
    }
  }

  const toolbar = createToolbar({
    store,
    targetElement: toolbarEl,
    onPrint: () => {
      flushGeneration();
      window.print();
    },
  });

  const sidebar = createSidebar(store, sidebarEl);

  const presetSlot = document.getElementById('preset-slot');
  if (presetSlot) {
    createPresetPanel({
      store,
      targetElement: presetSlot,
      onPresetApplied: () => {
        sidebar.updateSelection();
        toolbar.syncFromStore();
        scheduleGeneration(true);
      },
    });
  }

  // 状態変更前の主要プロパティを記録して、即時再生成かデバウンス再生成かを判定
  let lastModuleId = store.getState().moduleId;
  let lastSeed = store.getState().seed;
  let lastBatchCount = store.getState().batchCount;
  let lastOutputMode = store.getState().outputMode;
  let lastAnswerOrder = store.getState().answerOrder;
  let lastStartSheetIndex = store.getStartSheetIndex();

  store.subscribe(() => {
    const currentState = store.getState();
    const currentStartSheetIndex = store.getStartSheetIndex();

    const isMajorChange =
      currentState.moduleId !== lastModuleId ||
      currentState.seed !== lastSeed ||
      currentState.batchCount !== lastBatchCount ||
      currentState.outputMode !== lastOutputMode ||
      currentState.answerOrder !== lastAnswerOrder ||
      currentStartSheetIndex !== lastStartSheetIndex;

    lastModuleId = currentState.moduleId;
    lastSeed = currentState.seed;
    lastBatchCount = currentState.batchCount;
    lastOutputMode = currentState.outputMode;
    lastAnswerOrder = currentState.answerOrder;
    lastStartSheetIndex = currentStartSheetIndex;

    toolbar.syncFromStore();
    sidebar.paramForm.syncValues();

    // モジュール切替、シード再生成、コード読込、枚数変更等は即時実行
    // パラメータスライダー・数値等の連続微調整は 200ms デバウンス
    scheduleGeneration(isMajorChange);
  });

  // ブラウザメニュー等からの印刷に備え beforeprint イベントでもフラッシュ
  window.addEventListener('beforeprint', () => {
    flushGeneration();
  });

  // Ctrl+P / Cmd+P のインターセプト
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      flushGeneration();
      window.print();
    }
  });

  // 初回起動時のプレビュー表示
  flushGeneration();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
