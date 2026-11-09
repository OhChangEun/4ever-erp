import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';
import { KeywordRequest } from '@/app/types/KeywordType';

// 공급업체 카테고리 코드
export type SupplierCategory = 'MATERIAL' | 'PARTS' | 'ETC';
// 공급업체 상태 코드
export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

// 공급업체 목록 조회 파라미터
export interface SupplierListParams extends PageRequest, KeywordRequest {
  category?: string;
  statusCode?: string;
}

// 자재 정보
export type Material = Schema<'Material'>;

// 공급업체 담당자 정보
export type ManagerInfo = Schema<'ManagerInfo'>;

// 공급업체 정보
export type SupplierInfo = Schema<'SupplierInfo'>;

// 공급업체 목록 한 줄
export type SupplierListItem = Schema<'SupplierListItem'>;

// 공급업체 목록 응답
export type SupplierListResponse = Schema<'SupplierListResponse'>;

// 공급업체 상세
export type SupplierDetail = Schema<'SupplierDetail'>;

// 공급업체 등록 바디
export type CreateSupplierBody = Schema<'CreateSupplierBody'>;

// 공급업체 수정 바디
export type UpdateSupplierBody = Schema<'UpdateSupplierBody'>;
