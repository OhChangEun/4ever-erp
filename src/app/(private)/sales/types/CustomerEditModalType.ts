import { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import { ModalProps } from '@/app/components/common/modal/types';

export interface CustomerEditModalProps extends ModalProps {
  /** 열 때의 고객 정보. 모달이 이 값으로 자기 폼 상태를 한 번 채운다 */
  editFormData: CustomerDetail | null;
}

export interface CustomerResponse {
  data: {
    customerId: string;
    customerNumber: string;
    customerName: string;
    ceoName: string;
    businessNumber: string;
    statusCode: string;
    customerPhone: string;
    customerEmail: string;
    baseAddress: string;
    detailAddress: string;
    manager: {
      managerName: string;
      managerPhone: string;
      managerEmail: string;
    };
    note: string;
  };
}

export interface CustomerEditData {
  customerName: string;
  ceoName: string;
  businessNumber: string;
  customerPhone: string;
  customerEmail: string;
  baseAddress: string;
  detailAddress: string;
  statusCode: string;
  manager: {
    name: string;
    mobile: string;
    email: string;
  };
  note: string;
}
