/**
 * プリセット管理パネルコンポーネント
 * ARCHITECTURE.md §7 準拠
 */

import { deletePreset, loadPresets, savePreset } from '../core/presets';
import type { Preset, StorageLike } from '../types/schema';
import type { AppStore } from './appState';

export interface PresetPanelOptions {
  readonly store: AppStore;
  readonly storage?: StorageLike;
  readonly targetElement?: HTMLElement;
  readonly onPresetApplied?: (preset: Preset) => void;
}

export interface PresetPanelController {
  readonly element: HTMLElement;
  render(): void;
}

/**
 * プリセット管理パネルを生成する
 */
export function createPresetPanel(opts: PresetPanelOptions): PresetPanelController {
  const container = opts.targetElement ?? document.createElement('div');
  container.className = 'preset-panel';

  const { store } = opts;
  // storage は store が持つ storage または window.localStorage（なければインメモリ）
  const storage: StorageLike =
    opts.storage ?? (store as unknown as { storage?: StorageLike }).storage ?? window.localStorage;

  function render(): void {
    container.innerHTML = '';

    const titleEl = document.createElement('h4');
    titleEl.className = 'preset-panel__title';
    titleEl.textContent = '設定プリセット';
    container.appendChild(titleEl);

    // 新規保存ブロック
    const saveBox = document.createElement('div');
    saveBox.className = 'preset-panel__save-box';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'preset-panel__input';
    nameInput.placeholder = 'プリセット名（例: 難易度高め）';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--secondary preset-panel__btn-save';
    saveBtn.textContent = '保存';

    const errorMsg = document.createElement('div');
    errorMsg.className = 'preset-panel__error';
    errorMsg.setAttribute('role', 'alert');

    let isComposing = false;
    nameInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    nameInput.addEventListener('compositionend', () => {
      isComposing = false;
    });

    saveBtn.addEventListener('click', () => {
      if (isComposing) return;
      const name = nameInput.value.trim();
      if (!name) {
        errorMsg.textContent = 'プリセット名を入力してください';
        return;
      }

      errorMsg.textContent = '';
      const state = store.getState();
      savePreset(storage, {
        name,
        moduleId: state.moduleId,
        params: store.getCurrentParams(),
        batchCount: state.batchCount,
        outputMode: state.outputMode,
        answerOrder: state.answerOrder,
      });

      nameInput.value = '';
      renderList();
    });

    saveBox.appendChild(nameInput);
    saveBox.appendChild(saveBtn);
    saveBox.appendChild(errorMsg);
    container.appendChild(saveBox);

    // プリセット一覧コンテナ
    const listBox = document.createElement('div');
    listBox.className = 'preset-panel__list';
    container.appendChild(listBox);

    renderList();

    function renderList(): void {
      listBox.innerHTML = '';
      const allPresets = loadPresets(storage);
      const currentMid = store.getState().moduleId;

      // 現在のモジュールに対応するプリセットを優先表示
      const matching = allPresets.filter((p) => p.moduleId === currentMid);

      if (matching.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'preset-panel__empty';
        emptyEl.textContent = '保存されたプリセットはありません';
        listBox.appendChild(emptyEl);
        return;
      }

      for (const preset of matching) {
        const itemEl = document.createElement('div');
        itemEl.className = 'preset-panel__item';

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'preset-panel__btn-apply';
        // XSS 防止のため textContent でプリセット名を描画
        applyBtn.textContent = preset.name;
        applyBtn.addEventListener('click', () => {
          store.applyPreset(preset);
          if (opts.onPresetApplied) {
            opts.onPresetApplied(preset);
          }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'preset-panel__btn-delete';
        deleteBtn.textContent = '×';
        deleteBtn.setAttribute('title', '削除');
        deleteBtn.addEventListener('click', () => {
          deletePreset(storage, preset.id);
          renderList();
        });

        itemEl.appendChild(applyBtn);
        itemEl.appendChild(deleteBtn);
        listBox.appendChild(itemEl);
      }
    }
  }

  render();

  return {
    element: container,
    render,
  };
}
