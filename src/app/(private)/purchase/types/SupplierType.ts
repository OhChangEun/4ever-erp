import { Page, PageRequest } from '@/app/types/Page';
import { KeywordRequest } from '@/app/types/KeywordType';

// 공급업체 카테고리 코드
export type SupplierCategory = 'MATERIAL' | 'PARTS' | 'ETC';
// 공급업체 상태 코드
export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

// 자재 정보
export interface Material {
  materialName: string; // 제품명
  uomCode: string; // 단위
  unitPrice: number; // 단가
}

// 공급업체 담당자 정보
export interface ManagerInfo {
  managerName: string;
  managerPhone: string;
  managerEmail: string;
}

// 공급업체 입력
export interface CreateSupplierRequest {
  supplierInfo: {
    supplierName: string;
    supplierEmail: string;
    supplierPhone: string;
    supplierBaseAddress: string;
    supplierDetailAddress?: string | null;
    category: string;
    deliveryLeadTime: number;
  };
  managerInfo: ManagerInfo;
  materialList: Material[];
}

// 공급업체 수정
export interface ModSupplierRequestBody {
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierBaseAddress: string;
  supplierDetailAddress: string;
  category: string;
  statusCode: string;
  deliverLeadTime: number;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
}

// 공급업체 정보
export interface SupplierInfo {
  supplierId: string;
  supplierName: string;
  supplierNumber: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierBaseAddress: string;
  supplierDetailAddress: string | null;
  supplierStatusCode: SupplierStatus; // 상태값이 정해져 있으면 enum으로도 가능
  category: SupplierCategory;
  deliveryLeadTime: number; // 납기일 (단위: 일)
}

// 공급업체 리스트
export interface SupplierResponse {
  statusCode: string; // 삭제 예정
  supplierInfo: SupplierInfo;
}

// 공급업체 상세정보 최상위 응답 타입
export interface SupplierDetailResponse {
  supplierInfo: SupplierInfo;
  managerInfo: ManagerInfo;
}

// 공급업체 리스트 최상위 응답 타입
export interface SupplierListResponse {
  content: SupplierResponse[];
  page: Page;
}

export interface SupplierListRequestParams extends PageRequest, KeywordRequest {
  statusCode?: string;
  category?: string;
}
