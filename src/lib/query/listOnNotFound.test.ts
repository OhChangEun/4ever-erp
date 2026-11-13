// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * 카드 "없는 건은 404" 리뷰 A1. 상세 쿼리가 404 면 QueryCache onError 가 그 쿼리의 `meta.listOnNotFound` 목록을
 * 다시 받는다(`src/lib/queryClient.ts`). 상세 쿼리를 새로 쓰고 meta 를 빠뜨리면 404 뒤 목록에 사라진 행이 남는다.
 * 화면 코드에서 상세 키(`xxxKeys.detail(`, 견적 검토 `reviewDetail(`, 제품 상세 `bomKeys.materialInfo(`)로 쓰는
 * useQuery 를 찾아 meta 가 있는지 본다.
 */
const ROOT = 'src/app';
const DETAIL_QUERY = /^\s*queryKey:\s*\w+Keys\.(detail|reviewDetail|materialInfo)\(/gm;

/** 다시 받을 목록이 없어 meta 를 안 다는 곳. 이유를 같이 적는다 */
const WITHOUT_LIST: Record<string, string> = {
  // 직급 상세 모달을 여는 곳이 없고 직급 목록을 받는 쿼리도 없다(fetchPositionsList 를 부르는 곳 없음)
  'src/app/(private)/hrm/components/modals/PositionDetailModal.tsx': '직급 목록 쿼리 없음',
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });

const detailQueries = () =>
  sourceFiles(ROOT).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(DETAIL_QUERY)].map((match) => {
      // useQuery 옵션 객체는 다음 `});` 에서 끝난다(옵션 안에 `});` 를 쓰는 곳은 없다)
      const options = source.slice(match.index, source.indexOf('});', match.index));
      return { file, hasMeta: options.includes('listOnNotFound') };
    });
  });

describe('상세 쿼리의 meta.listOnNotFound', () => {
  it('화면의 상세 쿼리는 전부 404 뒤 다시 받을 목록을 meta 에 적는다', () => {
    const queries = detailQueries();
    const missing = queries
      .filter(({ file, hasMeta }) => !hasMeta && !(file in WITHOUT_LIST))
      .map(({ file }) => file);
    expect(missing).toEqual([]);
    // 상세 키 쿼리 18곳(견적 검토 상세, 출고 두 탭을 한 쿼리로 포함) + 제품 상세(BOM 자재) 1곳. 예외 1곳은 위 표
    expect(queries.filter(({ hasMeta }) => hasMeta)).toHaveLength(19);
  });
});
