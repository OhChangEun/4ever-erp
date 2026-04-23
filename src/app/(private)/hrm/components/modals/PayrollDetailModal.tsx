import { ModalProps } from '@/app/components/common/modal/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPayRollDetail, postPayrollComplete } from '@/app/(private)/hrm/api/hrm.api';
import Button from '@/app/components/common/Button';
import { PayRollCompleteRequestParams } from '../../types/HrmPayrollApiType';
import StatusLabel from '@/app/components/common/StatusLabel';
import { useToast } from '@/app/components/common/toast/useToast';

interface PayrollDetailModalProps extends ModalProps {
  payrollId: string;
  payStatus: string;
}

export function PayrollDetailModal({ payrollId, payStatus, onClose }: PayrollDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (params: PayRollCompleteRequestParams) => postPayrollComplete(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollList'] });
      onClose();
      toast.success('급여 지급 완료 처리되었습니다.');
    },
    onError: (error) => {
      console.log('급여 지급 처리 실패: ', error);
      toast.error('급여 지급 처리에 실패했습니다.');
    },
  });

  const handlePayrollComplete = () => {
    if (!payrollId) return;

    if (confirm('해당 급여를 지급 완료 처리하시겠습니까?')) {
      mutation.mutate({ payrollId });
    }
  };

  const {
    data: payrollData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payrollDetail', payrollId],
    queryFn: () => fetchPayRollDetail(payrollId),
  });

  if (isLoading) {
    return <div className="p-6 text-center">로딩 중...</div>;
  }

  if (isError || !payrollData) {
    return <div className="p-6 text-center text-red-600">데이터를 불러올 수 없습니다.</div>;
  }

  const { employee, pay, statusCode, expectedDate } = payrollData;

  return (
    <div className="space-y-6">
      {/* 직원 정보 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">직원 정보</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>이름:</strong> {employee.employeeName}
          </div>
          <div>
            <strong>부서:</strong> {employee.department}
          </div>
          <div>
            <strong>직급:</strong> {employee.position}
          </div>
        </div>
      </div>

      {/* 기본급 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">기본급</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">합계</span>
            <span className="text-blue-600 font-semibold">{pay.basePay.toLocaleString()}원</span>
          </div>
          {pay.basePayItem && pay.basePayItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.basePayItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{item.itemSum.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 초과근무비 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">초과근무비</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">합계</span>
            <span className="text-green-600 font-semibold">
              {pay.overtimePay.toLocaleString()}원
            </span>
          </div>
          {pay.overtimePayItem && pay.overtimePayItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.overtimePayItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{item.itemSum.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 공제액 */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="font-medium text-gray-900 mb-3">공제액</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">합계</span>
            <span className="text-red-600 font-semibold">{pay.deduction.toLocaleString()}원</span>
          </div>
          {pay.deductionItem && pay.deductionItem.length > 0 && (
            <div className="ml-4 space-y-1 text-sm text-gray-600">
              {pay.deductionItem.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>- {item.itemContent}</span>
                  <span>{item.itemSum.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 실지급액 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">실지급액</span>
          <span className="text-2xl font-bold text-purple-600">
            {pay.netPay.toLocaleString()}원
          </span>
        </div>
        <div className="mt-2">
          <StatusLabel $statusCode={statusCode} />
        </div>
      </div>

      {/* 급여 계산 정보 */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
        <div>
          <strong>지급 예정일:</strong> {new Date(expectedDate).toLocaleDateString('ko-KR')}
        </div>
        <div>
          <strong>조회일:</strong> {new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>

      {payStatus === 'PAYROLL_UNPAID' ? (
        <div className="flex justify-end">
          <Button label="지급완료 처리" variant="green" onClick={handlePayrollComplete}></Button>
        </div>
      ) : null}
    </div>
  );
}
