import { type ModalProps } from '@/app/components/common/modal/types';

export interface CustomerDetailModalProps extends ModalProps {
  selectedCustomerId: string;
}
