export interface CustomerInfoResponse {
  companyName: string;
  baseAddress: string;
  detailAddress: string;
  officePhone: string;
  businessNumber: string;
  customerName: string;
  phoneNumber: string;
  email: string;
}

export interface SupplierInfoResponse {
  businessNumber: string;
  supplierUserName: string;
  supplierUserEmail: string;
  supplierUserPhoneNumber: string;
  companyName: string;
  baseAddress: string;
  detailAddress: string;
  officePhone: string;
}

export interface ProfileInfo {
  companyName: string;
  baseAddress: string;
  detailAddress: string;
  officePhone: string;
  businessNumber: string;
  customerName: string;
  phoneNumber: string;
  email: string;
}

export interface ProfileInfoModalProps {
  setIsOpen: (show: boolean) => void;
}
