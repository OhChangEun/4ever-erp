'use client';

import {
  type ComponentType,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { type ModalItem, type ModalProps } from '@/app/components/common/modal/types';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { useIsClient } from '@/app/hooks/useMediaQuery';

// 모달 틀(Radix Dialog, gzip 약 12.7KB)은 모달을 열 때만 필요하다. 첫 로드에서 빼고 화면이 한가할 때 미리 받는다
const loadModalContainer = () => import('@/app/components/common/modal/ModalContainer');
const ModalContainer = dynamic(loadModalContainer, { ssr: false });

// ModalContext를 사용해서 addModal, removeModal에 접근하는 훅.
// Context에서 관리할 함수들의 타입 정의
interface ModalContextValue {
  addModal: <P extends ModalProps>(
    Component: ComponentType<P>, // 모달 컴포넌트
    props: Omit<P, 'id' | 'onClose'>, // id와 onClose는 자동 주입
  ) => string; // 모달 고유 ID 반환
  removeModal: (id: string) => void; // 모달 닫기
  removeAllModals: () => void;
}

// Context 생성
const ModalContext = createContext<ModalContextValue | undefined>(undefined);

// Context 접근용 커스텀 훅
export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModalContext는 ModalProvider에서 사용되어야 합니다.');
  return ctx;
};

// ModalProvider 구현부

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modals, setModals] = useState<ModalItem[]>([]); // 현재 열린 모달 목록
  // 포털은 document 가 있어야 한다. 서버 렌더와 첫 하이드레이션은 false
  const mounted = useIsClient();

  // 첫 그리기가 끝난 뒤 모달 틀을 미리 받아 둔다. 처음 여는 모달이 청크를 기다리지 않게
  useEffect(() => {
    const preload = () => void loadModalContainer();
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(preload, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Body 스크롤 잠금 처리
  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modals.length]);

  // 모달 제거 함수
  const removeModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const removeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  // 모달 추가 함수
  const addModal = useCallback(
    <P extends ModalProps>(
      Component: ComponentType<P>,
      props: Omit<P, 'id' | 'onClose'>,
    ): string => {
      const id = crypto.randomUUID(); // 고유 ID 생성
      const onClose = () => removeModal(id); // 자동 주입된 닫기 함수
      // Omit<P, 'id' | 'onClose'> 에 id 와 onClose 를 더하면 P 다. TS 는 제네릭 P 에서 이를 증명하지 못한다.
      // 모달 열기의 단언은 이 한 줄뿐이다(예전엔 useModal 2곳과 여기 1곳에서 ModalProps 로 넓혔다).
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const fullProps = { ...props, id, onClose } as P;
      const newModal: ModalItem = {
        id,
        title: fullProps.title,
        width: fullProps.width,
        height: fullProps.height,
        onClose,
        element: <Component {...fullProps} />,
        component: Component,
        // Radix Dialog 는 Dialog.Trigger 로 포커스를 돌린다. 코드로 여는 모달이라 연 순간의 포커스를 기억한다
        returnFocusTo:
          document.activeElement instanceof HTMLElement ? document.activeElement : null,
      };

      // 같은 버튼에서 같은 모달을 또 열면 무시한다. 모달 틀 청크가 오기 전에는 포커스가 버튼에 남아
      // Enter 두 번이 모달 두 개가 되고, 확인 모달이면 같은 요청이 두 번 나간다(2026-11-12 리뷰 A1).
      // 틀이 뜬 뒤에는 포커스가 모달 안으로 가므로 겹쳐 여는 모달(연 요소가 다르다)은 그대로 열린다.
      // 무시된 호출이 받는 id 는 스택에 없다. 그 id 로 닫아도 아무 일도 없다.
      setModals((prev) =>
        prev.some(
          (open) =>
            open.component === Component &&
            open.returnFocusTo === newModal.returnFocusTo &&
            newModal.returnFocusTo !== null &&
            newModal.returnFocusTo !== document.body,
        )
          ? prev
          : [...prev, newModal],
      );
      return id;
    },

    [removeModal],
  );

  return (
    <ModalContext.Provider value={{ addModal, removeModal, removeAllModals }}>
      {children}
      {mounted &&
        modals.length > 0 &&
        createPortal(
          <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 z-modal bg-black/50" />
            {/* 각 모달 */}
            {modals.map(({ id, title, width, height, onClose, element, returnFocusTo }) => (
              <ModalContainer
                key={id}
                title={title}
                onClose={onClose}
                returnFocusTo={returnFocusTo}
                width={width}
                height={height}
              >
                {element}
              </ModalContainer>
            ))}
          </>,
          document.body,
        )}
    </ModalContext.Provider>
  );
};
