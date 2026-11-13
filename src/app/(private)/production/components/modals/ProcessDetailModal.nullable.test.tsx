import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { dropAt, nullAt, serveEdited, valueAt } from '@/test/contract/mockData';
import { PRODUCTION_ENDPOINTS } from '@/app/(private)/production/api/production.endpoints';
import MesDetail from './ProcessDetailModal';

const URL = PRODUCTION_ENDPOINTS.MES_WORK_ORDER_DETAIL('mes-001');

/** 첫 공정 카드에서 label 칸 옆 값 */
const firstValueOf = (label: string) =>
  screen.getAllByText(label)[0].nextElementSibling?.textContent;

describe('MES 상세 모달의 빈 값(응답 null 허용 카드)', () => {
  it.each([
    ['null', nullAt],
    ['키 누락', dropAt],
  ])(
    '공정 시작, 종료 시각과 담당자가 %s 이어도 나머지를 그리고 빈 칸은 - 로 보인다',
    async (_, edit) => {
      const data = await serveEdited(URL, (d) => {
        edit(d, ['operations', 0, 'startedAt']);
        edit(d, ['operations', 0, 'finishedAt']);
        edit(d, ['operations', 0, 'manager']);
      });
      renderWithProviders(<MesDetail id="m" onClose={() => undefined} mesId="mes-001" />);

      expect(await screen.findByText(String(valueAt(data, ['productName'])))).toBeInTheDocument();
      expect(
        screen.getByText(String(valueAt(data, ['operations', 0, 'operationName']))),
      ).toBeInTheDocument();
      expect(firstValueOf('담당자')).toBe('-');
      expect(firstValueOf('시작시간')).toBe('-');
      expect(firstValueOf('종료시간')).toBe('-');
    },
  );

  it('담당자는 있는데 이름만 null 이면 담당자 칸이 - 로 보인다', async () => {
    const data = await serveEdited(URL, (d) => nullAt(d, ['operations', 0, 'manager', 'name']));
    renderWithProviders(<MesDetail id="m" onClose={() => undefined} mesId="mes-001" />);

    expect(await screen.findByText(String(valueAt(data, ['productName'])))).toBeInTheDocument();
    expect(firstValueOf('담당자')).toBe('-');
  });
});
