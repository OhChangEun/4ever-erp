'use client';

import { createContext } from 'react';

/**
 * BOM 상세의 상태 토글과 충돌 재현 버튼을 보일지. 실백엔드(BACKEND_API_URL)가 붙으면 false.
 * 게이트웨이 PATCH /boms/{id} 는 BomCreateRequestDto 를 받아 {statusCode, version} 을 버리고 빈 수정이 간다.
 * 값이 안 오면 숨긴다(기본값 false). 실화면은 ProductionClient 가 늘 값을 준다
 * verified=false (provenance: 게이트웨이 사본 PpController, 실제 상태 변경 API 는 팀과 합의 전)
 */
export const BomStatusActionsContext = createContext(false);
