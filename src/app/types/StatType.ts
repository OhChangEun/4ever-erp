import type { Schema } from '@/lib/api/contract';
// 이번주, 이번달, 이번 분기, 연도별
export type Period = 'week' | 'month' | 'quarter' | 'year';

// 각 지표의 기본 구조
export type Stat = Schema<'Stat'>;

// 지표 api 응답 데이터 구조
export type StatResponse<T> = {
  [key in Period]: T;
};

// stat card UI 출력 형식 >> 아이콘은 추후 넣을지 상의
export interface StatCardType {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  /** 기간 안의 추이(시각화 1). 있으면 스파크라인을 그린다 */
  trend?: readonly number[];
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}
