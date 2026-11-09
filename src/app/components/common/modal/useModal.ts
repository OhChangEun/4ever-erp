import { useModalContext } from '@/app/components/common/modal/ModalProvider';
import { ModalProps } from '@/app/components/common/modal/types';
import type { ComponentType } from 'react';

// openModal과 closeModal이라는 더 편리한 모달 제어 API를 제공.
// 내부적으로 useModalContext를 사용.
export const useModal = () => {
  const { addModal, removeModal, removeAllModals } = useModalContext();

  /**
   * 함수 오버로딩 (타입 안정성 확보)
   * → 모달의 props 타입(T)을 자동으로 추론하도록 함
   * → id, onClose는 사용자가 넘기지 않도록 Omit 처리
   */
  function openModal<T extends ModalProps>(
    Component: ComponentType<T>,
    props: Omit<T, 'id' | 'onClose'>,
  ): string;

  function openModal<T extends ModalProps>(
    Component: ComponentType<T>,
    props: Omit<T, 'id' | 'onClose'>,
  ): string {
    const id = addModal(Component, props);

    return id;
  }

  const closeModal = (id: string) => removeModal(id);

  return { openModal, closeModal, removeAllModals };
};
