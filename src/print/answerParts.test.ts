import { describe, expect, it } from 'vitest';
import { ANSWER_STYLE, type BodyBox, type ChecklistItem } from '../types/schema';
import {
  answerCircle,
  answerPath,
  answerRect,
  checklistTableHtml,
  formatColumnSummary,
  formatQuadrantSummary,
  quadrantGuides,
} from './answerParts';

describe('src/print/answerParts.ts', () => {
  it('answerCircle renders red circle stroke without fill, respecting strokeScale', () => {
    const svg = answerCircle(50, 60, 10, 150);
    expect(svg).toContain(`stroke="${ANSWER_STYLE.color}"`);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('cx="50"');
    expect(svg).toContain('cy="60"');
    // r = 10 * 0.5 + 0.8 = 5.8
    expect(svg).toContain('r="5.8"');
    // stroke-width = 0.6 * 150 / 100 = 0.9
    expect(svg).toContain('stroke-width="0.9"');
  });

  it('answerRect renders red rounded rect with 1mm radius', () => {
    const svg = answerRect(10, 20, 30, 40, 100);
    expect(svg).toContain(`stroke="${ANSWER_STYLE.color}"`);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('rx="1" ry="1"');
    expect(svg).toContain('stroke-width="0.6"');
  });

  describe('answerPath', () => {
    it('renders red dashed thick path for 2+ points', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 20, y: 30 },
        { x: 40, y: 50 },
      ];
      const svg = answerPath(points, 100);
      expect(svg).toContain('d="M 10 10 L 20 30 L 40 50"');
      expect(svg).toContain(`stroke="${ANSWER_STYLE.color}"`);
      expect(svg).toContain(`stroke-dasharray="${ANSWER_STYLE.pathDashArray}"`);
      expect(svg).toContain('stroke-width="0.9"');
    });

    it('returns empty string when points length is less than 2', () => {
      expect(answerPath([])).toBe('');
      expect(answerPath([{ x: 10, y: 10 }])).toBe('');
    });
  });

  it('quadrantGuides generates cross midline lines and 4 quadrant labels', () => {
    const body: BodyBox = { widthMm: 186, heightMm: 237 };
    const svg = quadrantGuides(body);
    // midX = 93, midY = 118.5
    expect(svg).toContain('x1="93" y1="0" x2="93" y2="237"');
    expect(svg).toContain('x1="0" y1="118.5" x2="186" y2="118.5"');
    expect(svg).toContain('左上');
    expect(svg).toContain('右上');
    expect(svg).toContain('左下');
    expect(svg).toContain('右下');
  });

  it('formatQuadrantSummary formats 2-line summary with correct totals', () => {
    const summary = formatQuadrantSummary({
      topLeft: { targets: 5, total: 10 },
      topRight: { targets: 5, total: 10 },
      bottomLeft: { targets: 5, total: 10 },
      bottomRight: { targets: 5, total: 10 },
    });
    const lines = summary.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('正解数　左上 5　右上 5　左下 5　右下 5　（計 20）');
    expect(lines[1]).toBe('検出数　左上 __/5　右上 __/5　左下 __/5　右下 __/5　（計 __/20）');
  });

  it('formatColumnSummary formats 2-line summary for left/center/right', () => {
    const summary = formatColumnSummary({
      left: { targets: 3, total: 6 },
      center: { targets: 4, total: 6 },
      right: { targets: 5, total: 6 },
    });
    const lines = summary.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('正解数　左 3　中 4　右 5　（計 12）');
    expect(lines[1]).toBe('検出数　左 __/3　中 __/4　右 __/5　（計 __/12）');
  });

  describe('checklistTableHtml', () => {
    it('returns empty string for empty checklist', () => {
      expect(checklistTableHtml([])).toBe('');
    });

    it('escapes text content and formats points', () => {
      const items: ChecklistItem[] = [
        {
          id: 'item-1',
          label: '「朝食」の前に<薬>を飲む',
          expected: '朝 & 昼',
          points: 10,
        },
      ];
      const html = checklistTableHtml(items);
      expect(html).toContain('&lt;薬&gt;');
      expect(html).toContain('朝 &amp; 昼');
      expect(html).toContain('10点');
      expect(html).toContain('☐');
    });
  });
});
