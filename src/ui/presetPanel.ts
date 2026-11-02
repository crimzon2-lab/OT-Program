/**
 * プリセット管理パネルコンポーネント
 * ARCHITECTURE.md §7, §12 準拠
 * TASKS.md Task 80
 */

import {
  deletePreset,
  exportPresetsJson,
  importPresetsJson,
  loadPresets,
  savePreset,
} from '../core/presets';
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

    const statusMsg = document.createElement('div');
    statusMsg.className = 'preset-panel__error';
    statusMsg.setAttribute('role', 'status');

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
        statusMsg.textContent = 'プリセット名を入力してください';
        return;
      }

      statusMsg.textContent = '';
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
    saveBox.appendChild(statusMsg);
    container.appendChild(saveBox);

    // プリセット一覧コンテナ
    const listBox = document.createElement('div');
    listBox.className = 'preset-panel__list';
    container.appendChild(listBox);

    // ファイル書き出し／読み込み（JSON入出力）ブロック
    const fileActionsBox = document.createElement('div');
    fileActionsBox.className = 'preset-panel__file-actions';
    fileActionsBox.style.display = 'flex';
    fileActionsBox.style.gap = '6px';
    fileActionsBox.style.marginTop = '8px';

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn btn--secondary preset-panel__btn-export';
    exportBtn.style.fontSize = '11px';
    exportBtn.style.padding = '4px 8px';
    exportBtn.textContent = 'JSONへ書き出し';
    exportBtn.title = '保存済みプリセットをJSONファイルとして保存します';

    exportBtn.addEventListener('click', () => {
      try {
        const jsonText = exportPresetsJson(storage);
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reha-print-presets.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        statusMsg.textContent = 'エクスポートに失敗しました';
      }
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'btn btn--secondary preset-panel__btn-import';
    importBtn.style.fontSize = '11px';
    importBtn.style.padding = '4px 8px';
    importBtn.textContent = 'JSONから読み込み';
    importBtn.title = 'JSONファイルからプリセットを読み込みマージします';

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = typeof reader.result === 'string' ? reader.result : '';
          const result = importPresetsJson(storage, content);
          if (result.error) {
            statusMsg.textContent = result.error;
          } else {
            statusMsg.textContent = `${result.imported} 件のプリセットを読み込みました`;
            renderList();
          }
        } catch {
          statusMsg.textContent = '読み込み中にエラーが発生しました';
        } finally {
          // 同じファイルを再度選択できるように値をリセット
          fileInput.value = '';
        }
      };

      reader.onerror = () => {
        statusMsg.textContent = 'ファイルの読み込みに失敗しました';
        fileInput.value = '';
      };

      reader.readAsText(file);
    });

    fileActionsBox.appendChild(exportBtn);
    fileActionsBox.appendChild(importBtn);
    fileActionsBox.appendChild(fileInput);
    container.appendChild(fileActionsBox);

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
