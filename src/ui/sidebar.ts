/**
 * サイドバーコンポーネント
 * ARCHITECTURE.md §7 準拠
 */

import { getModulesByDomain } from '../core/registry';
import { DOMAIN_LABELS, DOMAIN_ORDER } from '../types/schema';
import type { AppStore } from './appState';
import { createParamForm, type ParamFormController } from './paramForm';

export interface SidebarController {
  readonly element: HTMLElement;
  readonly paramForm: ParamFormController;
  updateSelection(): void;
}

/**
 * サイドバーを生成する
 */
export function createSidebar(
  store: AppStore,
  targetElement?: HTMLElement,
): SidebarController {
  const container = targetElement ?? document.createElement('aside');
  container.id = 'sidebar';
  container.className = 'sidebar';

  const paramForm = createParamForm(store);

  // 1. アプリロゴ/タイトル
  const titleBox = document.createElement('div');
  titleBox.className = 'sidebar__app-title';
  titleBox.textContent = 'リハプリント自動生成';
  container.appendChild(titleBox);

  // 2. ドメイン・モジュールナビゲーション
  const nav = document.createElement('nav');
  nav.className = 'sidebar__nav';

  for (const domain of DOMAIN_ORDER) {
    const group = document.createElement('div');
    group.className = 'sidebar__domain-group';

    const groupTitle = document.createElement('div');
    groupTitle.className = 'sidebar__domain-title';
    groupTitle.textContent = DOMAIN_LABELS[domain];
    group.appendChild(groupTitle);

    const moduleList = document.createElement('div');
    moduleList.className = 'sidebar__module-list';

    const modules = getModulesByDomain(domain);
    if (modules.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'sidebar__module-empty';
      emptyNote.textContent = '（準備中）';
      moduleList.appendChild(emptyNote);
    } else {
      for (const m of modules) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sidebar__module-btn';
        btn.dataset.moduleId = m.id;
        btn.textContent = `${m.id} ${m.shortTitle}`;
        btn.addEventListener('click', () => {
          store.selectModule(m.id);
          updateSelection();
        });
        moduleList.appendChild(btn);
      }
    }
    group.appendChild(moduleList);
    nav.appendChild(group);
  }
  container.appendChild(nav);

  // 3. 選択中モジュールの詳細と設定
  const activeSection = document.createElement('div');
  activeSection.className = 'sidebar__active-section';

  const moduleHeader = document.createElement('div');
  moduleHeader.className = 'sidebar__active-header';
  activeSection.appendChild(moduleHeader);

  // パラメータフォームを配置
  activeSection.appendChild(paramForm.element);
  container.appendChild(activeSection);

  // 4. プリセットパネル用マウントスロット
  const presetSlot = document.createElement('div');
  presetSlot.id = 'preset-slot';
  presetSlot.className = 'sidebar__preset-slot';
  container.appendChild(presetSlot);

  function updateSelection(): void {
    const currentMid = store.getState().moduleId;
    const currentMod = store.getCurrentModule();

    // ボタンの選択状態を更新
    const buttons = container.querySelectorAll<HTMLButtonElement>('.sidebar__module-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.moduleId === currentMid);
    });

    // モジュール見出し・説明文の更新
    moduleHeader.innerHTML = '';
    if (currentMod) {
      const h3 = document.createElement('h3');
      h3.className = 'sidebar__module-title';
      h3.textContent = `${currentMod.id}: ${currentMod.title}`;

      const desc = document.createElement('p');
      desc.className = 'sidebar__module-desc';
      desc.textContent = currentMod.description;

      moduleHeader.appendChild(h3);
      moduleHeader.appendChild(desc);
      paramForm.render(currentMod);
    } else {
      const h3 = document.createElement('h3');
      h3.className = 'sidebar__module-title';
      h3.textContent = `選択中: ${currentMid}`;

      const desc = document.createElement('p');
      desc.className = 'sidebar__module-desc';
      desc.textContent = '（このモジュールは現在準備中です）';

      moduleHeader.appendChild(h3);
      moduleHeader.appendChild(desc);
      paramForm.render(undefined);
    }
  }

  // 初期選択状態の反映
  updateSelection();

  return {
    element: container,
    paramForm,
    updateSelection,
  };
}
