/**
 * 모든 모달이 기본적으로 가져야 할 속성 정의
 */
export interface ModalProps {
  id?: string; // 모달의 고유 식별자 (자동 생성됨)
  title?: string;
  width?: string;
  height?: string;
  onClose: () => void; // 닫기 이벤트 함수 (필수)
}

/**
 * 모달 스택 한 칸. 컴포넌트와 props 를 따로 들고 있으면 모든 모달을 ModalProps 로 단언해야 해서,
 * 열 때 만든 요소(element)와 틀(ModalContainer)에 필요한 값만 둔다.
 */
export interface ModalItem {
  id: string;
  title?: string;
  width?: string;
  height?: string;
  onClose: () => void;
  element: React.ReactNode;
}
