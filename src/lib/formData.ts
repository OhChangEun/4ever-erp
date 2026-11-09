/**
 * FormData 를 `as string` 없이 읽는다. `get` 은 string | File | null 을 주므로
 * 글자가 아니면(없거나 파일) 빈 문자열로 둔다. 필수 검사는 호출하는 쪽이 한다.
 */
export const formText = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

/** 같은 이름의 값 여러 개(체크박스 묶음)에서 글자만 모은다 */
export const formTexts = (data: FormData, name: string): string[] =>
  data.getAll(name).filter((value): value is string => typeof value === 'string');
