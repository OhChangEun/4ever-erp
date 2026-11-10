import { type ModalProps } from '@/app/components/common/modal/types';
import { useQuery } from '@tanstack/react-query';
import { fetchPayRollDetail } from '@/app/(private)/hrm/api/hrm.api';
import { Button } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';
import { useCompletePayroll } from '@/app/(private)/hrm/api/hrm.mutations';
import { errorMessageOf } from '@/lib/AppError';
import { payrollKeys } from '@/app/(private)/hrm/api/hrm.keys';

import { formatCurrency } from '@/app/utils/number';
import { useLocale, useTranslations } from 'next-intl';
interface PayrollDetailModalProps extends ModalProps {
  payrollId: string;
  payStatus: string;
}

export function PayrollDetailModal({ payrollId, payStatus, onClose }: PayrollDetailModalProps) {
  const toast = useToast();
  const t = useTranslations('hrm');
  // 한국어는 예전처럼 2026. 11. 10., 영어는 11/10/2026
  const dateLocale = useLocale() === 'ko' ? 'ko-KR' : 'en-US';

  const mutation = useCompletePayroll({
    onSuccess: () => {
      onClose();
      toast.success(t('payroll.completed'));
    },
    onError: (error) => toast.error(t('payroll.completeError', { message: errorMessageOf(error) })),
  });

  const handlePayrollComplete = () => {
    if (!payrollId) return;

    if (confirm(t('payroll.completeConfirm'))) {
      mutation.mutate({ payrollId });
    }
  };

  const {
    data: payrollData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: payrollKeys.detail(payrollId),
    queryFn: () => fetchPayRollDetail(payrollId),
  });

  if (isLoading) {
    return <div className="p-6 text-center">{t('payroll.detailLoading')}</div>;
  }

  if (isError || !payrollData) {
    return <div className="p-6 text-center text-red-600">{t('common.loadFailed')}</div>;
  }

  const { employee, pay, statusCode, expectedDate } = payrollData;

  return (
    <div className="space-y-6">
      {/* 직원 정보 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">{t('common.employee')}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>{t('common.name')}:</strong> {employee.employeeName}
          </div>
          <div>
            <strong>{t('common.department')}:</strong> {employee.department}
          </div>
          <div>
            <strong>{t('common.position')}:</strong> {employee.position}
          </div>
        </div>
      </div>

      {/* 기본급 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">{t('payroll.basePay')}</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">{t('payroll.total')}</span>
            <span className="text-blue-600 font-semibold">{formatCurrency(pay.basePay)}</span>
          </div>
          {pay.basePayItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.basePayItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{formatCurrency(item.itemSum)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 초과근무비 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">{t('payroll.overtimePay')}</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">{t('payroll.total')}</span>
            <span className="text-green-600 font-semibold">{formatCurrency(pay.overtimePay)}</span>
          </div>
          {pay.overtimePayItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.overtimePayItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{formatCurrency(item.itemSum)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 공제액 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">{t('payroll.deduction')}</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">{t('payroll.total')}</span>
            <span className="text-red-600 font-semibold">{formatCurrency(pay.deduction)}</span>
          </div>
          {pay.deductionItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.deductionItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{formatCurrency(item.itemSum)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 실지급액 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">{t('payroll.netPay')}</span>
          <span className="text-2xl font-bold text-purple-600">{formatCurrency(pay.netPay)}</span>
        </div>
        <div className="mt-2">
          <StatusLabel statusCode={statusCode} />
        </div>
      </div>

      {/* 급여 계산 정보 */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
        <div>
          <strong>{t('payroll.expectedDate')}:</strong>{' '}
          {new Date(expectedDate).toLocaleDateString(dateLocale)}
        </div>
        <div>
          <strong>{t('payroll.viewedDate')}:</strong> {new Date().toLocaleDateString(dateLocale)}
        </div>
      </div>

      {payStatus === 'PAYROLL_UNPAID' ? (
        <div className="flex justify-end">
          <Button
            label={t('payroll.complete')}
            onClick={handlePayrollComplete}
            loading={mutation.isPending}
          />
        </div>
      ) : null}
    </div>
  );
}
