import React, { ReactNode } from 'react';

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  headerRender?: () => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  hoverable?: boolean;
  className?: string;
  /**
   * 테이블 내부 스크롤 영역의 최대 높이 (ex: '400px', '60vh', '100%')
   */
  maxHeight?: string;
  /**
   * 테이블 내부 스크롤 영역의 고정 높이 (ex: '400px', '60vh')
   */
  height?: string;
}

/**
 * 데이터 테이블. 행 40px, 숫자는 tabular-nums, 구분은 1px 선으로만.
 * 정렬 기본값은 왼쪽. 숫자·금액 열만 호출부에서 align="right" 로 지정한다.
 */
export default function Table<T = Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
  hoverable = true,
  className = '',
  maxHeight,
  height,
}: TableProps<T>) {
  const getAlignClass = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const getCellValue = (row: T, column: TableColumn<T>, index: number): ReactNode => {
    const value = (row as Record<string, unknown>)[column.key];
    if (column.render) {
      return column.render(value, row, index);
    }
    return String(value ?? '-');
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col ${className}`}
    >
      <div
        className="overflow-auto custom-scroll w-full"
        style={{
          maxHeight: maxHeight ?? height ?? '100%',
          height: height,
        }}
      >
        <table className="w-full table-fixed text-[13px] tabular-nums">
          <thead className="sticky top-0 z-local bg-gray-50">
            <tr className="h-10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 text-xs font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap ${getAlignClass(column.align)}`}
                  style={{ width: column.width }}
                >
                  {column.headerRender ? column.headerRender() : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor ? keyExtractor(row, index) : index}
                  className={`h-10 border-b border-gray-100 last:border-0 ${
                    hoverable ? 'hover:bg-gray-50 transition-colors' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2 text-gray-800 ${getAlignClass(column.align)}`}
                      style={{ width: column.width }}
                    >
                      {getCellValue(row, column, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
