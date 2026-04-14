'use client';

import {
  ComponentType,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ModalItem, ModalProps } from '@/app/components/common/modal/types';
import ModalContainer from '@/app/components/common/modal/ModalContainer';
import { createPortal } from 'react-dom';

// ModalContext를 사용해서 addModal, removeModal에 접근하는 훅.
// Context에서 관리할 함수들의 타입 정의
interface ModalContextValue {
  addModal: (
    Component: React.ComponentType<ModalProps>, // 모달 컴포넌트
    props: Omit<ModalProps, 'id' | 'onClose'>, // id와 onClose는 자동 주입
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
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
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
    (Component: ComponentType<ModalProps>, props: Omit<ModalProps, 'id' | 'onClose'>): string => {
      const id = crypto.randomUUID(); // 고유 ID 생성
      // 새 모달 객체 생성
      const newModal: ModalItem = {
        id,
        Component: Component,
        props: { ...props, id, onClose: () => removeModal(id) } as ModalProps, // 자동 주입된 닫기 함수
      };

      // 상태 업데이트 → 렌더링 트리거
      setModals((prev) => [...prev, newModal]);
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
            <div className="fixed inset-0 bg-black/50" />
            {/* 각 모달 */}
            {modals.map(({ id, Component, props }) => (
              <ModalContainer
                key={id}
                title={props.title}
                onClose={props.onClose}
                width={props.width}
                height={props.height}
              >
                <Component {...props} />
              </ModalContainer>
            ))}
          </>,
          document.body,
        )}
    </ModalContext.Provider>
  );
};
