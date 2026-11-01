import { describe, expect, it } from 'vitest';
import { BODY_BOX, TYPOGRAPHY } from '../types/schema';
import { attrs, esc, fmt, mm } from './html';
import { svgCircle, svgGroup, svgLine, svgPath, svgRect, svgRoot, svgText } from './svg';

describe('src/utils/html.ts', () => {
  it('esc escapes 5 special characters', () => {
    expect(esc('a & b < c > d " e \' f')).toBe('a &amp; b &lt; c &gt; d &quot; e &#39; f');
    expect(esc('normal text')).toBe('normal text');
  });

  it('fmt formats numbers to at most 2 decimal places and handles -0 and edge cases', () => {
    expect(fmt(-0)).toBe('0');
    expect(fmt(0)).toBe('0');
    expect(fmt(12.3)).toBe('12.3');
    expect(fmt(12.3)).toBe('12.3');
    expect(fmt(12.345)).toBe('12.35');
    expect(fmt(12.0001)).toBe('12');
    expect(fmt(-12.3)).toBe('-12.3');
    expect(() => fmt(Number.NaN)).toThrow(TypeError);
    expect(() => fmt(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it('mm returns formatted millimeter strings', () => {
    expect(mm(186)).toBe('186mm');
    expect(mm(12.345)).toBe('12.35mm');
  });

  it('attrs generates attribute strings properly', () => {
    expect(
      attrs({
        id: 'test',
        width: 10.5,
        required: true,
        disabled: false,
        optional: undefined,
      }),
    ).toBe('id="test" width="10.5" required');
    expect(attrs({})).toBe('');
  });
});

describe('src/utils/svg.ts', () => {
  it('svgRoot generates standard svg element with body box and font family', () => {
    const root = svgRoot(BODY_BOX.portrait, '<g></g>');
    expect(root).toBe(
      `<svg xmlns="http://www.w3.org/2000/svg" width="186mm" height="237mm" viewBox="0 0 186 237" font-family="${esc(TYPOGRAPHY.fontFamily)}"><g></g></svg>`,
    );
  });

  it('svgRoot appends extraAttrs if provided', () => {
    const root = svgRoot(BODY_BOX.landscape, '', { class: 'print-svg', 'data-sheet': 1 });
    expect(root).toBe(
      `<svg xmlns="http://www.w3.org/2000/svg" width="273mm" height="150mm" viewBox="0 0 273 150" font-family="${esc(TYPOGRAPHY.fontFamily)}" class="print-svg" data-sheet="1"></svg>`,
    );
  });

  it('svgText escapes text content and formats coordinates', () => {
    const text = svgText(10.123, 20.456, 'Tom & Jerry <Kids>', { fill: '#000000' });
    expect(text).toBe('<text x="10.12" y="20.46" fill="#000000">Tom &amp; Jerry &lt;Kids&gt;</text>');
  });

  it('generates svgLine, svgRect, svgCircle, svgPath, svgGroup', () => {
    expect(svgLine(1, 2, 3, 4, { stroke: 'black' })).toBe('<line x1="1" y1="2" x2="3" y2="4" stroke="black" />');
    expect(svgRect(5, 6, 7, 8)).toBe('<rect x="5" y="6" width="7" height="8" />');
    expect(svgCircle(9, 10, 11)).toBe('<circle cx="9" cy="10" r="11" />');
    expect(svgPath('M 0 0 L 10 10')).toBe('<path d="M 0 0 L 10 10" />');
    expect(svgGroup('<circle />', { id: 'grp' })).toBe('<g id="grp"><circle /></g>');
  });
});
