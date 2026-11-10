import { type ApiResponse, PROFILE_ENDPOINTS } from '@/app/types/api';
import {
  type CustomerInfoResponse,
  type ProfileInfo,
  type SupplierInfoResponse,
} from './types/CustomerOrSupplierInfoType';
import axios from '@/lib/axiosInstance';

const normalizeProfileInfo = (data: CustomerInfoResponse | SupplierInfoResponse): ProfileInfo => {
  if ('supplierUserName' in data) {
    return {
      companyName: data.companyName,
      baseAddress: data.baseAddress,
      detailAddress: data.detailAddress,
      officePhone: data.officePhone,
      businessNumber: data.businessNumber,
      customerName: data.supplierUserName,
      phoneNumber: data.supplierUserPhoneNumber,
      email: data.supplierUserEmail,
    };
  }

  return {
    companyName: data.companyName,
    baseAddress: data.baseAddress,
    detailAddress: data.detailAddress,
    officePhone: data.officePhone,
    businessNumber: data.businessNumber,
    customerName: data.customerName,
    phoneNumber: data.phoneNumber,
    email: data.email,
  };
};

export const getSupOrCusProfile = async (): Promise<ProfileInfo> => {
  const res = await axios.get<ApiResponse<CustomerInfoResponse | SupplierInfoResponse>>(
    PROFILE_ENDPOINTS.PROFILE_INFO,
  );

  return normalizeProfileInfo(res.data.data);
};
