import { getResponse, http, HttpResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import { server } from '@/test/msw-server';

/** 응답 data 안의 위치. 숫자는 배열 인덱스 */
export type Path = (string | number)[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** MSW 핸들러가 주는 응답 data 를 그대로 꺼낸다 */
export const mockData = async (url: string): Promise<unknown> => {
  const origin = 'http://localhost';
  const response = await getResponse(handlers, new Request(new URL(url, origin)), {
    baseUrl: origin,
  });
  if (!response) throw new Error(`목 핸들러 없음: ${url}`);
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new Error(`응답 래퍼가 아님: ${url}`);
  return body.data;
};

/** path 의 부모 객체와 마지막 키. 경로가 목에 없으면 테스트가 잘못된 것이라 바로 실패시킨다 */
const parentAt = (root: unknown, path: Path): [Record<string, unknown>, string] => {
  let node = root;
  for (const key of path.slice(0, -1)) {
    if (!isRecord(node)) throw new Error(`목에 ${path.join('.')} 경로가 없다`);
    node = node[String(key)];
  }
  const last = path.at(-1);
  if (!isRecord(node) || last === undefined || !(String(last) in node)) {
    throw new Error(`목에 ${path.join('.')} 경로가 없다`);
  }
  return [node, String(last)];
};

/** path 위치의 값을 null 로 바꾼다 */
export const nullAt = (root: unknown, path: Path): void => {
  const [parent, key] = parentAt(root, path);
  parent[key] = null;
};

/** path 위치의 키를 지운다(서버가 필드를 아예 안 보낸 경우) */
export const dropAt = (root: unknown, path: Path): void => {
  const [parent, key] = parentAt(root, path);
  Reflect.deleteProperty(parent, key);
};

/** path 위치 값을 읽는다. 화면 테스트가 목에 있는 글자를 찾을 때 쓴다 */
export const valueAt = (root: unknown, path: Path): unknown => {
  const [parent, key] = parentAt(root, path);
  return parent[key];
};

/** url 의 목 응답 data 를 바꿔(edit) 그 url 로 다시 내보낸다. 바꾼 data 를 돌려준다 */
export const serveEdited = async (url: string, edit: (data: unknown) => void): Promise<unknown> => {
  const data = await mockData(url);
  edit(data);
  server.use(
    http.get(url, () => HttpResponse.json({ status: 200, success: true, message: 'OK', data })),
  );
  return data;
};
