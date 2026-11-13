import { beforeAll, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import MesTab from './MesTab';

/**
 * 카드 "목 데이터 현실성". 기본 목으로 본다.
 * 예전 상세 목은 어떤 행을 열어도 MES-2026-001 모터 A 100 EA 였다.
 * 제품은 그 MES 가 가리키는 영업 견적의 첫 품목이다(카드 "목 필터와 검색". 예전 순번 규칙은 QT-2026-004 → 센서 D 였다)
 */
// jsdom 에는 scrollTo 가 없다. MES 표가 진행 중 공정으로 가로 스크롤한다
beforeAll(() => {
  Element.prototype.scrollTo = () => {};
});

describe('MES 상세는 목록에서 연 행의 내용이다', () => {
  it('셋째 행(QT-2026-004 모터 A 200 EA)을 열면 상세도 그 제품과 수량이다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MesTab />);

    // 머리 행 다음부터 mes-001, mes-002, mes-003. 목록은 MES 번호 대신 견적 번호를 보인다
    const third = (await screen.findAllByRole('row', {}, { timeout: 3000 }))[3];
    expect(within(third).getByText('QT-2026-004')).toBeInTheDocument();
    expect(within(third).getByText('모터 A')).toBeInTheDocument();
    expect(within(third).getByText('200')).toBeInTheDocument();
    await user.click(third);

    const detail = within(await screen.findByRole('dialog', { name: 'MES 현황' }));
    expect(await detail.findByText('작업지시: MES-2026-003')).toBeInTheDocument();
    expect(detail.getByText('모터 A')).toBeInTheDocument();
    expect(detail.getByText('200 EA')).toBeInTheDocument();
  });
});
