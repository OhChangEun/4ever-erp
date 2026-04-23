import { ModalProps } from '@/app/components/common/modal/types';
import {
  AttendanceListData,
  UpdateTimeRecord,
} from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import Button from '@/app/components/common/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putTimeRecord } from '@/app/(private)/hrm/api/hrm.api';
import { FormEvent } from 'react';
import { formatTime } from '@/app/utils/date';
import { useToast } from '@/app/components/common/toast/useToast';

interface AttendanceEditModalProps extends ModalProps {
  attendance: AttendanceListData;
}

export function AttendanceEditModal({ attendance, onClose }: AttendanceEditModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (params: UpdateTimeRecord) => putTimeRecord(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceList'] });
      onClose();
      toast.success('출결 정보가 수정되었습니다.');
    },
    onError: (error) => {
      console.error('출결 정보 수정 실패', error);
      toast.error('출결 정보 수정에 실패했습니다.');
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const checkInTime = formData.get('checkInTime') as string;
    const checkOutTime = formData.get('checkOutTime') as string;

    const timeData: UpdateTimeRecord = {
      timerecordId: attendance.timerecordId,
      checkInTime: `${attendance.workDate}T${checkInTime}`,
      checkOutTime: `${attendance.workDate}T${checkOutTime}`,
    };

    mutation.mutate(timeData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">직원명</label>
        <input
          type="text"
          defaultValue={attendance.employee.employeeName}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">출근 시간</label>
          <input
            name="checkInTime"
            type="time"
            defaultValue={formatTime(attendance.checkInTime)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">퇴근 시간</label>
          <input
            name="checkOutTime"
            type="time"
            defaultValue={formatTime(attendance.checkOutTime)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" label="수정" />
      </div>
    </form>
  );
}
