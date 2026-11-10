import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('데이터가 없으면 안내만', () => {
    render(<BomCostTree bomData={[]} />);
    expect(screen.getByText('BOM 데이터가 없습니다.')).toBeInTheDocument();
  });
});
