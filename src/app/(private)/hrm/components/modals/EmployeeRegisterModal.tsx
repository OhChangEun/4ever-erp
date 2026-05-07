'use client';

import { ModalProps } from '@/app/components/common/modal/types';
import Button from '@/app/components/common/Button';
import Dropdown from '@/app/components/common/Dropdown';
import Input from '@/app/components/common/Input';
import CalendarButton from '@/app/components/common/CalendarButton';
import LoadingMessage from '@/app/components/common/LoadingMessage';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDepartmentsDropdown,
  fetchPositionsDropdown,
  postEmployeeRegister,
} from '@/app/(private)/hrm/api/hrm.api';
import { EmployeeRegisterRequest } from '../../types/HrmEmployeesApiType';
import { useDropdown } from '@/app/hooks/useDropdown';
import { useToast } from '@/app/components/common/toast/useToast';

export default function EmployeeRegisterModal({ onClose }: ModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [formData, setFormData] = useState<EmployeeRegisterRequest>({
    name: '',
    departmentId: '',
    positionId: '',
    email: '',
    phoneNumber: '',
    hireDate: '',
    birthDate: '',
    baseAddress: '',
    detailAddress: '',
  });

  const { options: departmentsOptions } = useDropdown(
    'departmentsDropdown',
    fetchDepartmentsDropdown,
    'with-all',
  );
  const toast = useToast();

  const { data: positionData, isLoading: isPositionLoading } = useQuery({
    queryKey: ['positionsDropdown', selectedDepartment],
    queryFn: () => fetchPositionsDropdown(selectedDepartment),
    enabled: !!selectedDepartment,
  });

  const queryClient = useQueryClient();
  const { mutate: registerEmployee, isPending: isRegistering } = useMutation({
    mutationFn: (body: EmployeeRegisterRequest) => postEmployeeRegister(body),
    onSuccess: () => {
      toast.success('회원 등록 성공');
      setFormData({
        name: '',
        departmentId: '',
        positionId: '',
        email: '',
        phoneNumber: '',
        hireDate: '',
        birthDate: '',
        baseAddress: '',
        detailAddress: '',
      });

      queryClient.invalidateQueries({ queryKey: ['employeesList'] });
      onClose();
    },
    onError: (error) => {
      console.log('회원 등록 실패: ', error);
      toast.error('회원 등록에 실패했습니다.');
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requestBody: EmployeeRegisterRequest = {
      ...formData,
      departmentId: selectedDepartment,
      positionId: selectedPosition,
    };
    registerEmployee(requestBody);
  };

  // 로딩 표시
  if (isRegistering || isPositionLoading) return <LoadingMessage />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="이메일"
          type="email"
          name="email"
          placeholder="hong@company.com"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          label="이름"
          type="text"
          name="name"
          placeholder="홍길동"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">부서</label>
          <Dropdown
            items={departmentsOptions}
            value={selectedDepartment}
            onChange={(dept: string) => {
              setSelectedDepartment(dept);
              setSelectedPosition('');
            }}
            placeholder="부서 선택"
          />
        </div>
        {selectedDepartment && (
          <div className="flex-1 fade-in">
            <label className="block pl-1 text-sm font-medium text-gray-700 mb-1">직급</label>
            <Dropdown
              items={positionData ?? []}
              value={selectedPosition}
              onChange={setSelectedPosition}
              placeholder="직급 선택"
            />
          </div>
        )}
      </div>

      <Input
        label="전화번호"
        type="tel"
        name="phoneNumber"
        placeholder="010-1234-5678"
        value={formData.phoneNumber}
        onChange={handleChange}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
          <CalendarButton
            selectedDate={formData.hireDate}
            onDateChange={(date) => setFormData((prev) => ({ ...prev, hireDate: date || '' }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
          <CalendarButton
            maxDate={new Date()}
            selectedDate={formData.birthDate}
            onDateChange={(date) => setFormData((prev) => ({ ...prev, birthDate: date || '' }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="주소"
          type="text"
          name="baseAddress"
          placeholder="서울시 강남구 테헤란로 123"
          value={formData.baseAddress}
          onChange={handleChange}
        />
        <Input
          label="상세 주소"
          type="text"
          name="detailAddress"
          placeholder="3층 301호 (역삼동, 강남빌딩)"
          value={formData.detailAddress}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" label="등록" />
      </div>
    </form>
  );
}
