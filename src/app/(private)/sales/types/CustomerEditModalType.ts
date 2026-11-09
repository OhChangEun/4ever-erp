import type { Schema } from '@/lib/api/contract';
import { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import { ModalProps } from '@/app/components/common/modal/types';

export interface CustomerEditModalProps extends ModalProps {
  /** 열 때의 고객 정보. 모달이 이 값으로 자기 폼 상태를 한 번 채운다 */
  editFormData: CustomerDetail | null;
}

export type CustomerResponse = Schema<'CustomerResponse'>;

export type CustomerEditData = Schema<'CustomerEditData'>;
