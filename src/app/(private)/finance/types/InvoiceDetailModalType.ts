import { ModalProps } from '@/app/components/common/modal/types';

export interface InvoiceDetailModalProps extends ModalProps {
  selectedInvoiceId: string;
  setSelectedInvoiceId: (id: string) => void;
}

export interface InvoicetDetailRes {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  statusCode: string;
  issueDate: string;
  dueDate: string;
  name: string;
  referenceNumber: string;
  totalAmount: number;
  note: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitOfMaterialName: string;
    unitPrice: number;
    totalPrice: number;
  }[];
}
