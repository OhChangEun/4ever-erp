// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hangulStrings } from '../../scripts/count-hangul.mjs';

/** 사용자가 보는 화면 파일. 여기 한국어 문자열이 있으면 영어 화면에 한국어가 나온다 */
const SCREEN_ROOTS = [
  'src/app/(private)',
  'src/app/(public)',
  'src/app/components',
  'packages/ui/src',
  'src/app/error.tsx',
  'src/app/not-found.tsx',
  'src/app/hooks',
  'src/app/utils',
];

/**
 * 화면 파일인데 한국어 문자열을 그대로 두는 곳(남은 한국어 문자열 카드). 파일마다 문자열 수가 정확히 같아야 한다.
 * 새 화면 문구는 메시지(src/i18n/messages)에 넣는다. 여기를 늘릴 때는 화면에 안 나오는 이유를 적는다.
 */
const KEPT: Record<string, { count: number; reason: string }> = {
  'src/app/(private)/hrm/programTargets.ts': {
    count: 11,
    reason: '교육 대상 부서와 직급의 서버 값. 화면 글자는 hrm.programs.*Options',
  },
  'src/app/(private)/inventory/inventory.utils.ts': {
    count: 3,
    reason: '재고 이동 유형을 status 메시지 키(입고, 출고, 이동)로 바꾼다. StatusLabel 이 번역한다',
  },
  'src/app/(private)/production/components/modals/BomDetailModal.tsx': {
    count: 4,
    reason: 'BOM 상태의 서버 값(활성, 비활성) 비교와 전송',
  },
  'src/app/(private)/production/components/modals/BomInputFormModal.tsx': {
    count: 1,
    reason: '개발자 console.log',
  },
  'src/app/(private)/sales/sales.api.ts': {
    count: 1,
    reason: '개발자용 오류 message. 화면은 오류 종류 문구(sales.customerModal.accountError)',
  },
  'src/app/(public)/profile/components/AttendanceRecord.tsx': {
    count: 1,
    reason: '오늘 근태 상태의 서버 값(퇴근완료) 비교',
  },
  'src/app/components/common/modal/ModalProvider.tsx': {
    count: 1,
    reason: 'Provider 밖에서 훅을 부를 때 개발자에게 던지는 오류',
  },
  'src/app/components/common/toast/ToastProvider.tsx': {
    count: 1,
    reason: 'Provider 밖에서 훅을 부를 때 개발자에게 던지는 오류',
  },
  'src/app/hooks/useDropdown.tsx': {
    count: 1,
    reason: "서버가 옵션에 넣어 주는 '전체' 글자와 견주는 값. 화면이 붙이는 전체는 common.all",
  },
  'src/app/utils/number.ts': {
    count: 3,
    reason: 'compactWon 의 한국어 단위(억, 만, 천). 영어는 Intl compact',
  },
  'packages/ui/src/UiText.tsx': {
    count: 33,
    reason: '패키지 기본 문구(한국어). 앱은 UiTextBridge 로 ui 메시지를 넘긴다',
  },
  'packages/ui/src/koreanObjectParticle.ts': {
    count: 4,
    reason: '한국어 목적격 조사(을, 를) 고르기',
  },
};

describe('화면 파일의 한국어 문자열(남은 한국어 문자열 카드)', () => {
  it('예외 목록 말고는 없다. 예외 파일은 수가 정확히 같다', () => {
    const counts: Record<string, number> = {};
    for (const { file } of hangulStrings(SCREEN_ROOTS).strings) {
      counts[file] = (counts[file] ?? 0) + 1;
    }
    const kept = Object.fromEntries(Object.entries(KEPT).map(([file, { count }]) => [file, count]));
    expect(
      counts,
      '새 화면 문구는 src/i18n/messages 의 ko, en 에 넣고 useTranslations 로 꺼낸다. ' +
        '예외 파일에서 한국어를 줄였으면 KEPT 의 count 를 낮추거나 항목을 지운다. 목록: node scripts/count-hangul.mjs',
    ).toEqual(kept);
  });
});
