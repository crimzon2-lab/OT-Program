/**
 * パラメータフォーム自動生成コンポーネント
 * ARCHITECTURE.md §7 準拠
 */

import { getFullSchema, isFieldVisible } from '../core/params';
import type { AnyParamField, AnyTaskModule } from '../types/schema';
import type { AppStore } from './appState';

export interface ParamFormController {
  readonly element: HTMLElement;
  render(module: AnyTaskModule | undefined): void;
  syncValues(): void;
}

/**
 * パラメータフォーム生成・制御コントローラを生成する
 */
export function createParamForm(store: AppStore): ParamFormController {
  const container = document.createElement('div');
  container.className = 'param-form';

  let currentModule: AnyTaskModule | undefined;

  function render(module: AnyTaskModule | undefined): void {
    currentModule = module;
    container.innerHTML = '';

    if (!module) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'param-form__empty';
      emptyMsg.textContent = 'モジュールを選択してください';
      container.appendChild(emptyMsg);
      return;
    }

    const fullSchema = getFullSchema(module);
    const params = store.getCurrentParams();

    const form = document.createElement('form');
    form.className = 'param-form__form';
    form.onsubmit = (e) => e.preventDefault();

    for (const field of fullSchema) {
      const fieldWrapper = document.createElement('div');
      fieldWrapper.className = 'param-field';
      fieldWrapper.dataset.fieldKey = field.key;
      fieldWrapper.hidden = !isFieldVisible(field, params);

      const label = document.createElement('label');
      label.className = 'param-field__label';
      label.textContent = field.label;
      fieldWrapper.appendChild(label);

      buildControl(fieldWrapper, field, params[field.key], store);
      form.appendChild(fieldWrapper);
    }

    // リセットボタン
    const resetBox = document.createElement('div');
    resetBox.className = 'param-form__actions';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--reset';
    resetBtn.textContent = 'この課題を初期設定に戻す';
    resetBtn.addEventListener('click', () => {
      store.resetCurrentModuleParams();
      syncValues();
    });
    resetBox.appendChild(resetBtn);
    form.appendChild(resetBox);

    container.appendChild(form);
  }

  function syncValues(): void {
    if (!currentModule) return;
    const fullSchema = getFullSchema(currentModule);
    const params = store.getCurrentParams();

    for (const field of fullSchema) {
      const wrapper = container.querySelector<HTMLElement>(
        `[data-field-key="${field.key}"]`,
      );
      if (!wrapper) continue;

      wrapper.hidden = !isFieldVisible(field, params);
      const activeEl = document.activeElement;

      switch (field.kind) {
        case 'int': {
          const rangeInput = wrapper.querySelector<HTMLInputElement>('input[type="range"]');
          const numberInput = wrapper.querySelector<HTMLInputElement>('input[type="number"]');
          const val = Number(params[field.key]);
          if (rangeInput && rangeInput !== activeEl) {
            rangeInput.value = String(val);
          }
          if (numberInput && numberInput !== activeEl) {
            numberInput.value = String(val);
          }
          break;
        }

        case 'select': {
          const select = wrapper.querySelector<HTMLSelectElement>('select');
          if (select && select !== activeEl) {
            select.value = String(params[field.key]);
          }
          break;
        }

        case 'bool': {
          const checkbox = wrapper.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if (checkbox && checkbox !== activeEl) {
            checkbox.checked = Boolean(params[field.key]);
          }
          break;
        }

        case 'multi': {
          const selected = new Set(
            Array.isArray(params[field.key]) ? (params[field.key] as string[]) : [],
          );
          const checkboxes = wrapper.querySelectorAll<HTMLInputElement>(
            '.param-field__multi-opt input[type="checkbox"]',
          );
          checkboxes.forEach((cb) => {
            if (cb !== activeEl) {
              cb.checked = selected.has(cb.value);
            }
          });
          break;
        }

        case 'charSet': {
          const textInput = wrapper.querySelector<HTMLInputElement>('input[type="text"]');
          if (textInput && textInput !== activeEl) {
            textInput.value = String(params[field.key] ?? '');
          }
          break;
        }
      }
    }
  }

  function buildControl(
    wrapper: HTMLElement,
    field: AnyParamField,
    currentVal: unknown,
    appStore: AppStore,
  ): void {
    switch (field.kind) {
      case 'int': {
        const ctrl = document.createElement('div');
        ctrl.className = 'param-field__int-ctrl';

        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(field.min);
        range.max = String(field.max);
        range.step = String(field.step);
        range.value = String(currentVal);

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = String(field.min);
        numberInput.max = String(field.max);
        numberInput.step = String(field.step);
        numberInput.value = String(currentVal);

        range.addEventListener('input', () => {
          const v = Number(range.value);
          numberInput.value = range.value;
          appStore.updateParam(field.key, v);
          syncValues();
        });

        numberInput.addEventListener('input', () => {
          const v = Number(numberInput.value);
          if (Number.isFinite(v)) {
            range.value = String(v);
          }
        });

        const commitNumber = () => {
          let v = Number(numberInput.value);
          if (!Number.isFinite(v)) {
            v = field.default;
          }
          v = Math.max(field.min, Math.min(field.max, v));
          v = field.min + Math.round((v - field.min) / field.step) * field.step;
          v = Math.max(field.min, Math.min(field.max, v));
          numberInput.value = String(v);
          range.value = String(v);
          appStore.updateParam(field.key, v);
          syncValues();
        };

        numberInput.addEventListener('change', commitNumber);
        numberInput.addEventListener('blur', commitNumber);

        ctrl.appendChild(range);
        ctrl.appendChild(numberInput);
        if (field.unit) {
          const unitSpan = document.createElement('span');
          unitSpan.className = 'param-field__unit';
          unitSpan.textContent = field.unit;
          ctrl.appendChild(unitSpan);
        }
        wrapper.appendChild(ctrl);
        break;
      }

      case 'select': {
        const select = document.createElement('select');
        select.className = 'param-field__select';
        for (const opt of field.options) {
          const optEl = document.createElement('option');
          optEl.value = opt.value;
          optEl.textContent = opt.label;
          if (opt.value === currentVal) {
            optEl.selected = true;
          }
          select.appendChild(optEl);
        }
        select.addEventListener('change', () => {
          appStore.updateParam(field.key, select.value);
          syncValues();
        });
        wrapper.appendChild(select);
        break;
      }

      case 'bool': {
        const labelEl = document.createElement('label');
        labelEl.className = 'param-field__checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(currentVal);
        checkbox.addEventListener('change', () => {
          appStore.updateParam(field.key, checkbox.checked);
          syncValues();
        });
        labelEl.appendChild(checkbox);
        labelEl.appendChild(document.createTextNode(' 有効'));
        wrapper.appendChild(labelEl);
        break;
      }

      case 'multi': {
        const box = document.createElement('div');
        box.className = 'param-field__multi-box';

        const selectedSet = new Set(Array.isArray(currentVal) ? (currentVal as string[]) : []);

        for (const opt of field.options) {
          const optLabel = document.createElement('label');
          optLabel.className = 'param-field__multi-opt';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = opt.value;
          cb.checked = selectedSet.has(opt.value);

          cb.addEventListener('change', () => {
            const currentSelected = new Set(
              Array.isArray(appStore.getCurrentParams()[field.key])
                ? (appStore.getCurrentParams()[field.key] as string[])
                : [],
            );
            if (cb.checked) {
              currentSelected.add(opt.value);
            } else {
              currentSelected.delete(opt.value);
            }
            appStore.updateParam(field.key, Array.from(currentSelected));
            syncValues();
          });

          optLabel.appendChild(cb);
          optLabel.appendChild(document.createTextNode(` ${opt.label}`));
          box.appendChild(optLabel);
        }
        wrapper.appendChild(box);
        break;
      }

      case 'charSet': {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'param-field__text';
        textInput.value = String(currentVal ?? '');

        let isComposing = false;
        textInput.addEventListener('compositionstart', () => {
          isComposing = true;
        });
        textInput.addEventListener('compositionend', () => {
          isComposing = false;
          appStore.updateParam(field.key, textInput.value);
          syncValues();
        });
        textInput.addEventListener('input', () => {
          if (!isComposing) {
            appStore.updateParam(field.key, textInput.value);
            syncValues();
          }
        });
        wrapper.appendChild(textInput);
        break;
      }
    }
  }

  return {
    element: container,
    render,
    syncValues,
  };
}
