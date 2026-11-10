import type { Meta, StoryObj } from '@storybook/react-vite';
import Table, { type TableColumn } from './Table';

interface Row {
  id: string;
  name: string;
  quantity: number;
}

const columns: TableColumn<Row>[] = [
  { key: 'id', label: '코드' },
  { key: 'name', label: '품목' },
  { key: 'quantity', label: '수량', align: 'right' },
];

const rows: Row[] = [
  { id: 'ITM-1001', name: '모터 A', quantity: 120 },
  { id: 'ITM-1002', name: '펌프 B', quantity: 8 },
];

/** 제네릭 컴포넌트라 행 타입을 고정한 껍데기로 보인다 */
function RowTable({ data, emptyMessage }: { data: Row[]; emptyMessage?: string }) {
  return (
    <Table<Row>
      columns={columns}
      data={data}
      keyExtractor={(row) => row.id}
      emptyMessage={emptyMessage}
    />
  );
}

const meta = {
  title: '데이터/Table',
  component: RowTable,
  args: { data: rows },
} satisfies Meta<typeof RowTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { data: [], emptyMessage: '등록된 품목이 없습니다.' } };
