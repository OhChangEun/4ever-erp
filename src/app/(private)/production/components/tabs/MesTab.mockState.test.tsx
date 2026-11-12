import { beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import MesTab from './MesTab';

/**
 * 목이 쓰기 결과를 따르게 리뷰 P2. 기본 목(덮어쓰기 없음)으로 본다.
 * 예전 상세 목은 어떤 MES 를 열어도 진행중이라 "MES 시작"을 화면에서 누를 수 없었다.
 */
// jsdom 에는 scrollTo 가 없다. MES 표가 진행 중 공정으로 가로 스크롤한다
beforeAll(() => {
  Element.prototype.scrollTo = () => {};
});

describe('MES 목록과 상세: 시작 전인 건은 상세에서도 시작 전이고 시작할 수 있다', () => {
  it('목록에서 대기중인 행을 열면 MES 시작 버튼이 열려 있고, 누르면 상세와 목록이 진행중으로 바뀐다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MesTab />);

    // 머리 행, mes-001(진행중), mes-002(대기중) 순서. 상세 모달이 열리면 뒤의 표는 접근성 트리에서 숨어 hidden 으로 찾는다
    const waitingRow = async () =>
      (await screen.findAllByRole('row', { hidden: true }, { timeout: 3000 }))[2];
    expect(within(await waitingRow()).getByText('대기중')).toBeInTheDocument();
    await user.click(await waitingRow());

    const detail = within(await screen.findByRole('dialog', { name: 'MES 현황' }));
    const start = await detail.findByRole('button', { name: 'MES 시작' });
    expect(start).toBeEnabled();
    expect(detail.getByRole('button', { name: 'MES 완료' })).toBeDisabled();
    // 시작 전이라 공정은 아직 못 누른다
    for (const button of detail.getAllByRole('button', { name: '공정 시작' })) {
      expect(button).toBeDisabled();
    }

    await user.click(start);
    await waitFor(() => expect(detail.getByRole('button', { name: 'MES 시작' })).toBeDisabled());
    await waitFor(() => expect(detail.getByText('진행중')).toBeInTheDocument());
    // 첫 공정부터 시작할 수 있다
    expect(detail.getAllByRole('button', { name: '공정 시작' })[0]).toBeEnabled();
    await waitFor(async () =>
      expect(within(await waitingRow()).getByText('진행중')).toBeInTheDocument(),
    );
  });
});
