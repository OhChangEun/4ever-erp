import { ModalProps } from '@/app/components/common/modal/types';
import { fetchProgramDetail } from '../../api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import ModalStatusBox from '@/app/components/common/ModalStatusBox';
import StatusLabel from '@/app/components/common/StatusLabel';

interface ProgramDetailModalProps extends ModalProps {
  programId: string;
}

export default function ProgramDetailModal({ programId }: ProgramDetailModalProps) {
  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['programDetail'],
    queryFn: () => fetchProgramDetail(programId),
  });

  return (
    <>
      {isLoading ? (
        <ModalStatusBox type="loading" message="교육 프로그램을 불러오는 중입니다..." />
      ) : isError || !program ? (
        <ModalStatusBox type="error" message="교육 프로그램을 불러오는 중 오류가 발생했습니다." />
      ) : (
        <>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">교육 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>교육명:</strong> {program.programName}
                </div>
                <div>
                  <strong>카테고리:</strong> <StatusLabel statusCode={program.category} />
                </div>
                <div>
                  <strong>교육 시간:</strong> {program.trainingHour}시간
                </div>
                <div>
                  <strong>교육 방식:</strong> {program.isOnline ? '온라인' : '오프라인'}
                </div>
                <div>
                  <strong>시작일:</strong> {program.startDate}
                </div>
                <div>
                  <strong>상태:</strong> <StatusLabel statusCode={program.statusCode} />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                지정된 직원 목록 ({program.designatedEmployee?.length || 0}명)
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {program.designatedEmployee && program.designatedEmployee.length > 0 ? (
                  program.designatedEmployee.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.employeeName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.department} · {employee.position}
                          </div>
                          {employee.completedAt && (
                            <div className="text-xs text-gray-500">
                              완료일: {employee.completedAt}
                            </div>
                          )}
                        </div>
                        <span
                          className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full'}
                        >
                          <StatusLabel statusCode={employee.statusCode} />
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">지정된 직원이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
