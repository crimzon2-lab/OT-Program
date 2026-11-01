/**
 * ツールバーコンポーネント
 * ARCHITECTURE.md §3.7, §7 準拠
 */

import type { AnswerOrder, OutputMode } from '../types/schema';
import type { AppStore } from './appState';

export interface ToolbarOptions {
  readonly store: AppStore;
  readonly onPrint?: () => void;
  readonly targetElement?: HTMLElement;
}

export interface ToolbarController {
  readonly element: HTMLElement;
  syncFromStore(): void;
}

/**
 * ツールバーを生成する
 */
export function createToolbar(opts: ToolbarOptions): ToolbarController {
  const container = opts.targetElement ?? document.createElement('div');
  container.id = 'toolbar';
  container.className = 'toolbar';

  const { store } = opts;

  // 1. シード設定
  const seedGroup = document.createElement('div');
  seedGroup.className = 'toolbar__group toolbar__group--seed';

  const seedLabel = document.createElement('label');
  seedLabel.className = 'toolbar__label';
  seedLabel.textContent = 'シード: ';
  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.className = 'toolbar__input toolbar__input--seed';
  seedInput.value = store.getSeedInput();

  let isSeedComposing = false;
  seedInput.addEventListener('compositionstart', () => {
    isSeedComposing = true;
  });
  seedInput.addEventListener('compositionend', () => {
    isSeedComposing = false;
    store.setSeedInput(seedInput.value.trim());
  });
  seedInput.addEventListener('change', () => {
    if (!isSeedComposing) {
      store.setSeedInput(seedInput.value.trim());
    }
  });

  const regenBtn = document.createElement('button');
  regenBtn.type = 'button';
  regenBtn.className = 'btn btn--secondary toolbar__btn-regen';
  regenBtn.textContent = '別シードで再生成';
  regenBtn.addEventListener('click', () => {
    store.regenerateSeed();
    seedInput.value = store.getSeedInput();
  });

  seedLabel.appendChild(seedInput);
  seedGroup.appendChild(seedLabel);
  seedGroup.appendChild(regenBtn);
  container.appendChild(seedGroup);

  // 2. 枚数・出力モード・解答順
  const batchGroup = document.createElement('div');
  batchGroup.className = 'toolbar__group toolbar__group--batch';

  const batchLabel = document.createElement('label');
  batchLabel.className = 'toolbar__label';
  batchLabel.textContent = '枚数: ';
  const batchSelect = document.createElement('select');
  batchSelect.className = 'toolbar__select toolbar__select--batch';
  for (let n = 1; n <= 10; n++) {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = `${n} 枚`;
    if (n === store.getState().batchCount) opt.selected = true;
    batchSelect.appendChild(opt);
  }
  batchSelect.addEventListener('change', () => {
    store.setBatchCount(Number(batchSelect.value));
  });
  batchLabel.appendChild(batchSelect);
  batchGroup.appendChild(batchLabel);

  const outputLabel = document.createElement('label');
  outputLabel.className = 'toolbar__label';
  outputLabel.textContent = '出力: ';
  const outputSelect = document.createElement('select');
  outputSelect.className = 'toolbar__select toolbar__select--output';
  const optProb = document.createElement('option');
  optProb.value = 'problemOnly';
  optProb.textContent = '問題用紙のみ';
  const optWithAns = document.createElement('option');
  optWithAns.value = 'withAnswer';
  optWithAns.textContent = '問題＋解答セット';
  outputSelect.appendChild(optProb);
  outputSelect.appendChild(optWithAns);
  outputSelect.value = store.getState().outputMode;

  const orderLabel = document.createElement('label');
  orderLabel.className = 'toolbar__label';
  orderLabel.textContent = '解答の並び: ';
  const orderSelect = document.createElement('select');
  orderSelect.className = 'toolbar__select toolbar__select--order';
  const optGrouped = document.createElement('option');
  optGrouped.value = 'grouped';
  optGrouped.textContent = '問題をまとめて先';
  const optInter = document.createElement('option');
  optInter.value = 'interleaved';
  optInter.textContent = '1組ずつ交互';
  orderSelect.appendChild(optGrouped);
  orderSelect.appendChild(optInter);
  orderSelect.value = store.getState().answerOrder;

  outputSelect.addEventListener('change', () => {
    const mode = outputSelect.value as OutputMode;
    store.setOutputMode(mode);
    orderLabel.hidden = mode !== 'withAnswer';
  });
  orderSelect.addEventListener('change', () => {
    store.setAnswerOrder(orderSelect.value as AnswerOrder);
  });

  orderLabel.hidden = store.getState().outputMode !== 'withAnswer';

  outputLabel.appendChild(outputSelect);
  orderLabel.appendChild(orderSelect);
  batchGroup.appendChild(outputLabel);
  batchGroup.appendChild(orderLabel);
  container.appendChild(batchGroup);

  // 3. 条件・シードコード読み込み
  const codeGroup = document.createElement('div');
  codeGroup.className = 'toolbar__group toolbar__group--code';

  const codeLabel = document.createElement('label');
  codeLabel.className = 'toolbar__label';
  codeLabel.textContent = 'コード: ';
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'toolbar__input toolbar__input--code';
  codeInput.placeholder = 'RP1-M01-...';

  const loadCodeBtn = document.createElement('button');
  loadCodeBtn.type = 'button';
  loadCodeBtn.className = 'btn btn--secondary toolbar__btn-load-code';
  loadCodeBtn.textContent = 'コード読込';

  const codeError = document.createElement('span');
  codeError.className = 'toolbar__code-error';
  codeError.setAttribute('role', 'alert');

  let isCodeComposing = false;
  codeInput.addEventListener('compositionstart', () => {
    isCodeComposing = true;
  });
  codeInput.addEventListener('compositionend', () => {
    isCodeComposing = false;
  });

  loadCodeBtn.addEventListener('click', () => {
    if (isCodeComposing) return;
    const val = codeInput.value.trim();
    if (!val) {
      codeError.textContent = 'コードを入力してください';
      return;
    }
    const res = store.applySeedCode(val);
    if (!res.ok) {
      codeError.textContent = res.message;
    } else {
      codeError.textContent = '';
      codeInput.value = '';
      syncFromStore();
    }
  });

  codeLabel.appendChild(codeInput);
  codeGroup.appendChild(codeLabel);
  codeGroup.appendChild(loadCodeBtn);
  codeGroup.appendChild(codeError);
  container.appendChild(codeGroup);

  // 4. A4 印刷ボタン & 印刷設定案内文
  const printGroup = document.createElement('div');
  printGroup.className = 'toolbar__group toolbar__group--print';

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'btn btn--primary toolbar__btn-print';
  printBtn.textContent = 'A4印刷 (Ctrl+P)';
  printBtn.addEventListener('click', () => {
    if (opts.onPrint) {
      opts.onPrint();
    } else {
      window.print();
    }
  });
  printGroup.appendChild(printBtn);

  const printGuide = document.createElement('div');
  printGuide.className = 'toolbar__print-guide';
  printGuide.textContent =
    '印刷設定：用紙 A4／倍率「100%」または「実際のサイズ」／余白「なし」または「デフォルト」。印刷後にフッターの 50mm バーを定規で確認してください。';
  printGroup.appendChild(printGuide);

  container.appendChild(printGroup);

  function syncFromStore(): void {
    const state = store.getState();
    seedInput.value = store.getSeedInput();
    batchSelect.value = String(state.batchCount);
    outputSelect.value = state.outputMode;
    orderSelect.value = state.answerOrder;
    orderLabel.hidden = state.outputMode !== 'withAnswer';
  }

  return {
    element: container,
    syncFromStore,
  };
}
