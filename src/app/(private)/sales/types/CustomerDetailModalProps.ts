import { CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import { ModalProps } from '@/app/components/common/modal/types';

export interface CustomerDetailModalProps extends ModalProps {
  selectedCustomerId: string;
  setEditFormData: React.Dispatch<React.SetStateAction<CustomerDetail | null>>;
}
