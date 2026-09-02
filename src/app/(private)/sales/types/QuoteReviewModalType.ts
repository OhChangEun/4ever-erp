import { ModalProps } from '@/app/components/common/modal/types';

export interface Quote {
  id: string;
  customer: string;
  contact: string;
  date: string;
  deliveryDate: string;
  amount: number;
  status: string;
}

export interface InventoryItem {
  product: string;
  currentStock: number;
  requiredStock: number;
  available: boolean;
}

export interface InventoryCheckRes {
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  inventoryQuantity: number;
  shortageQuantity: number;
  statusCode: string;
  productionRequired: boolean;
  inventoryCheckTime: string;
}

export interface QuoteReviewModalProps extends ModalProps {
  selectedQuotationId: string;
}
