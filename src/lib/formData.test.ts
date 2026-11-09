import { describe, expect, it } from 'vitest';
import { formText, formTexts } from './formData';

describe('FormData 읽기', () => {
  const data = new FormData();
  data.append('name', '홍길동');
  data.append('tags', 'a');
  data.append('tags', 'b');
  data.append('file', new Blob(['x']), 'x.txt');

  it('글자 값은 그대로, 없거나 파일이면 빈 문자열', () => {
    expect(formText(data, 'name')).toBe('홍길동');
    expect(formText(data, 'missing')).toBe('');
    expect(formText(data, 'file')).toBe('');
  });

  it('여러 값은 글자만 모은다', () => {
    expect(formTexts(data, 'tags')).toEqual(['a', 'b']);
    expect(formTexts(data, 'file')).toEqual([]);
  });
});
