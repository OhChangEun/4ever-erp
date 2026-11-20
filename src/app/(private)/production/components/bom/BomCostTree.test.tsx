import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/render';
import userEvent from '@testing-library/user-event';
import BomCostTree from './BomCostTree';
import type { BomLevelStructureNode } from '../../types/BomDetailApiType';

const n = (
  id: string,
  name: string,
  parentId: string | null,
  quantity: number | null,
  unitCost?: number | null,
): BomLevelStructureNode => ({
  id,
  code: id,
  name,
  quantity,
  unit: 'EA',
  level: parentId ? 1 : 0,
  parentId,
  unitCost,
});

const data = [
  n('r', '모터', null, null),
  n('asm', '하우징 조립', 'r', 2),
  n('a', '알루미늄 판', 'asm', 3, 100),
  n('b', '볼트', 'asm', 1, 400),
  n('c', '샤프트', 'r', 1, null),
];

describe('BOM 원가 트리(시각화 7)', () => {
  it('요약에 완제품 원가(이상), 비중 큰 자재, 단가 없는 자재 수', () => {
    render(<BomCostTree bomData={data} />);
    const summary = screen.getByText(/완제품 1개 자재 원가/);
    expect(summary).toHaveTextContent('₩1,400 이상');
    expect(summary).toHaveTextContent(/단가 없는 자재 1개/);
    expect(screen.getByRole('group', { name: 'BOM 원가 트리' })).toHaveAttribute(
      'aria-describedby',
      summary.id,
    );
    expect(screen.getByText('단가 없음')).toBeInTheDocument();
  });

  it('하위가 있는 노드는 Enter 로 접고 편다', async () => {
    render(<BomCostTree bomData={data} />);
    const asm = screen.getByRole('button', { name: /하우징 조립/ });
    expect(asm).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('볼트')).toBeInTheDocument();
    asm.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /하우징 조립/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('볼트')).not.toBeInTheDocument();
    expect(screen.getByText('하위 2개 접힘')).toBeInTheDocument();
  });

  it('표로 보기는 모든 노드를 깊이 순서로', async () => {
    render(<BomCostTree bomData={data} />);
    await userEvent.click(screen.getByRole('button', { name: '표로 보기' }));
    const table = screen.getByRole('table', { name: 'BOM 원가 표' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.querySelectorAll('td')[1].textContent.trim())).toEqual([
      '모터',
      '하우징 조립',
      '알루미늄 판',
      '볼트',
      '샤프트',
    ]);
    // 단가 없는 자재가 아래에 있는 완제품은 표에서도 "이상"
    expect(rows[0].querySelectorAll('td')[4].textContent).toBe('₩1,400 이상');
  });

  it('완제품이 초기 영역 밖에 놓이면 한 단계씩 펼치고 전체 표와 원가는 보존한다', async () => {
    const many = Array.from({ length: 31 }, (_, i) =>
      n(
        String(i),
        '품목 ' + i,
        i ? String(Math.floor((i - 1) / 2)) : null,
        1,
        i >= 15 ? 100 : null,
      ),
    );
    const { rerender } = render(<BomCostTree bomData={many} />);
    const tree = within(screen.getByRole('group', { name: 'BOM 원가 트리' }));
    const assembly = tree.getByRole('button', { name: /^품목 1,/ });
    expect(assembly).toHaveAttribute('aria-expanded', 'false');
    expect(tree.queryByText('품목 3')).not.toBeInTheDocument();
    assembly.focus();
    await userEvent.keyboard('{Enter}');
    expect(assembly).toHaveFocus();
    expect(tree.getByRole('button', { name: /^품목 3,/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(tree.queryByText('품목 7')).not.toBeInTheDocument();
    rerender(<BomCostTree bomData={many.map((row) => ({ ...row }))} />);
    expect(assembly).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/완제품 1개 자재 원가/)).toHaveTextContent('₩1,600');
    await userEvent.click(screen.getByRole('button', { name: '표로 보기' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(32);
  });

  it('완제품에 자재가 직접 많이 붙은 경우 루트에서 모두 펼칠 수 있다', async () => {
    const parts = Array.from({ length: 30 }, (_, i) => n('c' + i, '자재' + i, 'r', 1, 100));
    render(<BomCostTree bomData={[n('r', '완제품', null, 1), ...parts]} />);
    const tree = within(screen.getByRole('group', { name: 'BOM 원가 트리' }));
    const root = tree.getByRole('button', { name: /^완제품,/ });
    expect(root).toHaveAttribute('aria-expanded', 'false');
    expect(tree.getByText('하위 30개 접힘')).toBeInTheDocument();
    root.focus();
    await userEvent.keyboard(' ');
    expect(root).toHaveFocus();
    expect(tree.getByText('자재29')).toBeInTheDocument();
  });

  it.each([
    { count: 11, expanded: 'true' },
    { count: 12, expanded: 'false' },
  ])(
    '직속 자재 $count개에서 완제품 상자의 하단 여백까지 들어오는지 판단한다',
    ({ count, expanded }) => {
      const parts = Array.from({ length: count }, (_, i) => n('c' + i, '자재' + i, 'r', 1, 100));
      render(<BomCostTree bomData={[n('r', '완제품', null, 1), ...parts]} />);
      expect(screen.getByRole('button', { name: /^완제품,/ })).toHaveAttribute(
        'aria-expanded',
        expanded,
      );
    },
  );

  it('같은 품목 코드가 다른 조립품 아래에 쓰이면 두 행의 수량을 모두 원가에 반영한다', () => {
    const first = { ...n('x1', '볼트', 'a', 2, 100), code: 'BOLT' };
    const second = { ...n('x2', '볼트', 'b', 3, 100), code: 'BOLT' };
    render(
      <BomCostTree
        bomData={[
          n('r', '완제품', null, 1),
          n('a', '조립품 A', 'r', 1),
          n('b', '조립품 B', 'r', 1),
          first,
          second,
        ]}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/완제품 1개 자재 원가/)).toHaveTextContent('₩500');
    expect(within(screen.getByRole('group')).getAllByText('볼트')).toHaveLength(2);
  });

  it.each([
    n('orphan', '부모 없는 자재', 'missing', 1, 250),
    n('second', '다른 완제품', null, 1, 250),
    n('a', '중복된 행 ID', 'r', 1, 250),
  ])('입력 행과 연결된 고유 노드의 수가 다르면 합계 대신 변환 오류를 표시한다', (extra) => {
    render(<BomCostTree bomData={[...data, extra]} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'BOM 데이터를 트리 구조로 변환할 수 없습니다.',
    );
    expect(screen.queryByText(/완제품 1개 자재 원가/)).not.toBeInTheDocument();
  });

  it('데이터가 없으면 안내만', () => {
    render(<BomCostTree bomData={[]} />);
    expect(screen.getByText('BOM 데이터가 없습니다.')).toBeInTheDocument();
  });
});
