'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getAnalytics } from '../../sales.api';
import { analyticsKeys } from '@/app/(private)/sales/sales.keys';
import { SalesAnalysis } from '@/app/(private)/sales/types/SalesChartType';
import { formatCurrency } from '@/app/(private)/sales/utils';
import DateRangePicker from '@/app/components/common/DateRangePicker';

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
    <i className="ri-bar-chart-line text-xl mb-2 text-gray-400" aria-hidden />
    <p>{message}</p>
  </div>
);

const SalesChart = () => {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 5);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(formatDate(sixMonthsAgo));
  const [endDate, setEndDate] = useState(formatDate(today));

  const minDate = formatDate(sixMonthsAgo);
  const maxDate = formatDate(today);

  const queryParams = useMemo(
    () => ({
      startDate: startDate || '',
      endDate: endDate || '',
    }),
    [startDate, endDate],
  );

  const {
    data: analyticsData,
    isLoading,
    isError,
  } = useQuery<SalesAnalysis>({
    queryKey: analyticsKeys.byParams(queryParams),
    queryFn: () => getAnalytics(queryParams),

    staleTime: 1000,
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  // trend 주차별 매출 추이 데이터
  const weeklyData = useMemo(() => {
    if (!analyticsData) return [];

    const monthWeekMap: Record<number, number> = {};

    return analyticsData.trend.map((t) => {
      if (!monthWeekMap[t.month]) {
        monthWeekMap[t.month] = 1;
      } else {
        monthWeekMap[t.month]++;
      }

      return {
        week: `${t.month}월 ${monthWeekMap[t.month]}주차`,
        sales: t.sale,
        orders: t.orderCount,
      };
    });
  }, [analyticsData]);

  // productShare 제품별 매출 비중
  const productData = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.productShare.map((p) => ({
      name: p.productName,
      value: p.saleShare,
      amount: p.sale,
    }));
  }, [analyticsData]);

  // topCustomers 주요 고객별 매출
  const customerData = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.topCustomers.map((c) => ({
      id: c.customerCode,
      name: c.customerName,
      orders: c.orderCount,
      amount: c.sale,
      active: c.active, // 필요 시 상태 추가
    }));
  }, [analyticsData]);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center space-x-4">
        <DateRangePicker
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
      </div>
      {/* 월별 매출 추이 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className=" flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">월별 매출 추이</h3>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">매출액</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">주문건수</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'sales' ? formatCurrency(Number(value)) : `${value}건`,
                    name === 'sales' ? '매출액' : '주문건수',
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="표시할 매출 추이 데이터가 없습니다." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-row items-center  justify-between mb-6">
            <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-0">
              제품별 매출 비중
            </h3>
          </div>

          <div className="h-64">
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {productData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, '비중']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="제품별 매출 데이터가 없습니다." />
            )}
          </div>
          {productData.length > 0 && (
            <div className="mt-4 space-y-2">
              {productData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.value}% ({formatCurrency(item.amount)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-row items-center  justify-between mb-6">
            <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-0">
              주요 고객별 매출
            </h3>
          </div>
          <div className="h-120 mt-15">
            {customerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const customer = customerData.find((c) => c.name === props.payload.name);
                      return [
                        `₩${(Number(value) / 100000000).toFixed(1)}억 (${customer?.orders ?? 0}건)`,
                        '매출액',
                      ];
                    }}
                  />
                  <defs>
                    <linearGradient id="barActive" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="barInactive" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#D1D5DB" />
                      <stop offset="100%" stopColor="#9CA3AF" />
                    </linearGradient>
                  </defs>

                  <Bar dataKey="amount">
                    {customerData.map((c, i) => (
                      <Cell key={i} fill={c.active ? 'url(#barActive)' : 'url(#barInactive)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="고객 매출 데이터가 없습니다." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
