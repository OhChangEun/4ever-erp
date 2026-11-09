import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table, { type TableColumn } from './Table';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const columns: TableColumn<Row>[] = [
  { key: 'name', label: '품목' },
  {
    key: 'amount',
    label: '금액',
    align: 'right',
    render: (value) => `₩${Number(value).toLocaleString()}`,
  },
];

const rows: Row[] = [
  { id: 1, name: '볼트', amount: 1200 },
  { id: 2, name: '너트', amount: 800 },
];

describe('Table', () => {
  it('헤더와 행을 그린다', () => {
    render(<Table columns={columns} data={rows} keyExtractor={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: '품목' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '금액' })).toBeInTheDocument();
    expect(screen.getByText('볼트')).toBeInTheDocument();
    expect(screen.getByText('너트')).toBeInTheDocument();
  });

  it('render 가 있는 열은 render 결과를 쓴다', () => {
    render(<Table columns={columns} data={rows} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('₩1,200')).toBeInTheDocument();
  });

  it('데이터가 비면 emptyMessage 를 보여준다', () => {
    render(<Table columns={columns} data={[]} emptyMessage="등록된 품목이 없습니다." />);
    expect(screen.getByText('등록된 품목이 없습니다.')).toBeInTheDocument();
  });

  it('행을 누르면 onRowClick 에 그 행과 인덱스를 준다', async () => {
    const onRowClick = vi.fn();
    render(
      <Table columns={columns} data={rows} keyExtractor={(r) => r.id} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText('너트'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1], 1);
  });

  it('isStale 이면 aria-busy 로 갱신 중을 알린다', () => {
    const { rerender } = render(<Table columns={columns} data={rows} keyExtractor={(r) => r.id} />);
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
    rerender(<Table columns={columns} data={rows} keyExtractor={(r) => r.id} isStale />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });
});
