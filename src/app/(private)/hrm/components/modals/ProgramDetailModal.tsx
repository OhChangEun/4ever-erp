import { type ModalProps } from '@/app/components/common/modal/types';
import { fetchProgramDetail } from '../../api/hrm.api';
import { useQuery } from '@tanstack/react-query';
import { ModalStatusBox } from '@everp/ui';
import StatusLabel from '@/app/components/common/StatusLabel';
import { programKeys } from '@/app/(private)/hrm/api/hrm.keys';
import { useTranslations } from 'next-intl';

interface ProgramDetailModalProps extends ModalProps {
  programId: string;
}

export default function ProgramDetailModal({ programId }: ProgramDetailModalProps) {
  const t = useTranslations('hrm');
  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: programKeys.detail(programId),
    queryFn: () => fetchProgramDetail(programId),
  });

  return (
    <>
      {isLoading ? (
        <ModalStatusBox type="loading" message={t('programs.loading')} />
      ) : isError || !program ? (
        <ModalStatusBox type="error" message={t('programs.loadError')} />
      ) : (
        <>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{t('programs.info')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>{t('programs.name')}:</strong> {program.programName}
                </div>
                <div>
                  <strong>{t('programs.category')}:</strong>{' '}
                  <StatusLabel statusCode={program.category} />
                </div>
                <div>
                  <strong>{t('programs.hours')}:</strong>{' '}
                  {t('common.hours', { count: program.trainingHour })}
                </div>
                <div>
                  <strong>{t('programs.mode')}:</strong>{' '}
                  {program.isOnline ? t('programs.online') : t('programs.offline')}
                </div>
                <div>
                  <strong>{t('programs.startDate')}:</strong> {program.startDate}
                </div>
                <div>
                  <strong>{t('common.status')}:</strong>{' '}
                  <StatusLabel statusCode={program.statusCode} />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                {t('programs.assignedEmployees', { count: program.designatedEmployee.length })}
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {program.designatedEmployee.length > 0 ? (
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
                              {t('common.completedAt', { date: employee.completedAt })}
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
                  <div className="text-center text-gray-500 py-4">{t('programs.noAssigned')}</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
