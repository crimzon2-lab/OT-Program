import { describe, expect, it } from 'vitest';
import type { RenderedPage } from '../types/schema';
import { renderHeaderHtml } from './header';
import { buildPageSizeCss, setPageOrientation } from './pageStyle';
import {
  renderFooterHtml,
  renderInstructionHtml,
  renderSheetHtml,
} from './sheet';

describe('src/print/sheet.ts and header.ts / pageStyle.ts', () => {
  const basePage: RenderedPage = {
    moduleId: 'M01',
    title: '抹消課題',
    orientation: 'portrait',
    seedCode: 'RP1-M01-12345-1',
    sheetIndex: 1,
    sheetCount: 1,
    pageNo: 1,
    pageTotal: 1,
    body: {
      pageRole: 'problem',
      kind: 'svg',
      markup: '<svg class="test-body-content"><circle cx="10" cy="10" r="5" /></svg>',
      instruction: '見本と同じ文字に〇をつけてください',
    },
  };

  describe('renderHeaderHtml differences across roles', () => {
    it('renders problem header with patient entry fields', () => {
      const html = renderHeaderHtml(basePage);
      expect(html).toContain('抹消課題');
      expect(html).toContain('RP1-M01-12345-1');
      expect(html).toContain('実施日');
      expect(html).toContain('氏名・ID');
      expect(html).toContain('所要時間');
      expect(html).toContain('メモ・スコア');
    });

    it('renders stimulus header with 【提示用シート】 and without patient entry fields', () => {
      const stimulusPage: RenderedPage = {
        ...basePage,
        body: {
          ...basePage.body,
          pageRole: 'stimulus',
        },
      };
      const html = renderHeaderHtml(stimulusPage);
      expect(html).toContain('抹消課題');
      expect(html).toContain('【提示用シート】');
      expect(html).not.toContain('氏名・ID');
      expect(html).not.toContain('所要時間');
    });

    it('renders answer header with 【解答・採点シート（検者用）】 and examiner fields', () => {
      const answerPage: RenderedPage = {
        ...basePage,
        body: {
          ...basePage.body,
          pageRole: 'answer',
        },
      };
      const html = renderHeaderHtml(answerPage);
      expect(html).toContain('抹消課題');
      expect(html).toContain('【解答・採点シート（検者用）】');
      expect(html).toContain('検者');
      expect(html).toContain('得点');
      expect(html).not.toContain('所要時間');
    });
  });

  describe('renderInstructionHtml', () => {
    it('escapes special characters and converts CRLF to <br />', () => {
      const raw = '1行目: <注意事項> & 指示\r\n2行目: 確実に〇をつけること';
      const html = renderInstructionHtml(raw, 'portrait', 100);
      expect(html).toContain('&lt;注意事項&gt; &amp; 指示<br />2行目: 確実に〇をつけること');
    });

    it('scales font-size down to 3.2mm when content exceeds 2 lines', () => {
      const longText = '1行目\n2行目\n3行目\n4行目';
      const html = renderInstructionHtml(longText, 'portrait', 100);
      expect(html).toContain('font-size: 3.2mm;');
    });

    it('renders empty container when instruction is undefined or whitespace', () => {
      expect(renderInstructionHtml(undefined, 'portrait')).toBe('<div class="sheet__instruction"></div>');
      expect(renderInstructionHtml('   ', 'portrait')).toBe('<div class="sheet__instruction"></div>');
    });
  });

  describe('renderFooterHtml', () => {
    it('includes 50mm calibration bar and page number', () => {
      const html = renderFooterHtml(basePage);
      expect(html).toContain('50mm（印刷倍率確認用）');
      expect(html).toContain('1 / 1');
    });

    it('includes batch sheet index when sheetCount > 1', () => {
      const batchPage: RenderedPage = {
        ...basePage,
        sheetIndex: 2,
        sheetCount: 3,
        pageNo: 1,
        pageTotal: 2,
      };
      const html = renderFooterHtml(batchPage);
      expect(html).toContain('1 / 2　（2 / 3 枚目）');
    });
  });

  describe('renderSheetHtml', () => {
    it('integrates header, instruction, raw body markup, and footer without double-escaping markup', () => {
      const html = renderSheetHtml(basePage);
      expect(html).toContain('class="sheet-frame sheet-frame--portrait"');
      expect(html).toContain('class="sheet sheet--portrait"');
      expect(html).toContain('data-role="problem"');
      expect(html).toContain('data-sheet="1"');
      // body markup must remain unescaped raw markup
      expect(html).toContain('<svg class="test-body-content"><circle cx="10" cy="10" r="5" /></svg>');
    });
  });

  describe('pageStyle.ts', () => {
    it('generates correct @page size CSS', () => {
      expect(buildPageSizeCss('portrait')).toBe('@page { size: A4 portrait; margin: 0; }');
      expect(buildPageSizeCss('landscape')).toBe('@page { size: A4 landscape; margin: 0; }');
    });

    it('safely runs in Node environment without throwing', () => {
      expect(() => setPageOrientation('portrait')).not.toThrow();
    });
  });
});
