import { describe, expect, it } from 'vitest';
import { diffBundles } from './bundle-diff.mjs';

const KB = 1024;
const route = (name: string, gzip: number) => ({ route: name, gzip });

describe('diffBundles(CI 번들 크기 비교)', () => {
  it('예산(5KB)을 넘게 늘어난 라우트가 있으면 실패 목록에 넣는다', () => {
    const result = diffBundles(
      [route('/a', 100 * KB), route('/b', 100 * KB)],
      [route('/a', 106 * KB), route('/b', 104 * KB)],
      5,
    );
    expect(result.over.map((r) => r.route)).toEqual(['/a']);
    expect(result.ok).toBe(false);
  });

  it('줄거나 예산 안이면 통과', () => {
    const result = diffBundles([route('/a', 100 * KB)], [route('/a', 99 * KB)], 5);
    expect(result.ok).toBe(true);
    expect(result.over).toEqual([]);
  });

  it('새 라우트와 없어진 라우트는 표에 표시만 하고 실패시키지 않는다', () => {
    const result = diffBundles([route('/old', 50 * KB)], [route('/new', 300 * KB)], 5);
    expect(result.ok).toBe(true);
    expect(result.markdown).toContain('/new');
    expect(result.markdown).toContain('새 라우트');
    expect(result.markdown).toContain('/old');
    expect(result.markdown).toContain('없어짐');
  });

  it('마크다운 표에 기준, 지금, 차이(KB)를 적는다', () => {
    const result = diffBundles([route('/a', 100 * KB)], [route('/a', 102.5 * KB)], 5);
    expect(result.markdown).toContain('| /a | 100.0 | 102.5 | +2.5 |');
  });
});
