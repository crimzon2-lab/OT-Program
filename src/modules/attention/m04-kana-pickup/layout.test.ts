import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../../../data/passages';
import { formatPassageLines, isLineHeadProhibited } from './layout';

describe('M04 layout (formatPassageLines)', () => {
  it('全18編のPASSAGESで、solid・wakachiの双方において文字欠落が一切ないこと', () => {
    for (const p of PASSAGES) {
      const rawCount = p.kanaText.replace(/ /g, '').length;

      // solid
      const solidLines = formatPassageLines(p.kanaText, 'solid', 25);
      const solidTotal = solidLines.reduce((acc, l) => acc + l.chars.length, 0);
      expect(solidTotal).toBe(rawCount);

      // wakachi
      const wakachiLines = formatPassageLines(p.kanaText, 'wakachi', 25);
      const wakachiTotal = wakachiLines.reduce((acc, l) => acc + l.chars.length, 0);
      expect(wakachiTotal).toBe(rawCount);
    }
  });

  it('全18編のPASSAGESで、どの行の先頭文字も行頭禁則文字（「、」「。」「ー」や小書き文字）にならないこと', () => {
    for (const p of PASSAGES) {
      for (const cols of [15, 20, 25, 30]) {
        // solid
        const solidLines = formatPassageLines(p.kanaText, 'solid', cols);
        for (const line of solidLines) {
          expect(line.chars.length).toBeGreaterThan(0);
          const firstChar = line.chars[0]!.ch;
          expect(isLineHeadProhibited(firstChar)).toBe(false);
        }

        // wakachi
        const wakachiLines = formatPassageLines(p.kanaText, 'wakachi', cols);
        for (const line of wakachiLines) {
          expect(line.chars.length).toBeGreaterThan(0);
          const firstChar = line.chars[0]!.ch;
          expect(isLineHeadProhibited(firstChar)).toBe(false);
        }
      }
    }
  });

  it('極端に狭い列幅（長文節耐性: maxCols: 6）でも無限ループせず安全に折り返されること', () => {
    const text = 'きょうは とてもながいぶんせつですが だいじょうぶです。';
    const lines = formatPassageLines(text, 'wakachi', 6);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(isLineHeadProhibited(line.chars[0]!.ch)).toBe(false);
    }
  });

  it('連続禁則文字（「っ。」など）でも行頭禁則が守られること', () => {
    const text = 'あいうえおっ。かきくけこ';
    const lines = formatPassageLines(text, 'solid', 5);
    for (const line of lines) {
      expect(isLineHeadProhibited(line.chars[0]!.ch)).toBe(false);
    }
  });
});
