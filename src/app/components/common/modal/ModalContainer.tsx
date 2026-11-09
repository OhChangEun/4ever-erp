'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NESTED_LAYER_SELECTOR, PopoverRootContext } from '../PopoverPortal';

interface ModalContainerProps {
  children: React.ReactNode;
  title?: string;
  width?: string;
  height?: string;
  onClose: () => void;
  /** 닫힌 뒤 포커스를 돌려줄 요소(보통 모달을 연 버튼) */
  returnFocusTo?: HTMLElement | null;
}

/**
 * 모달 프레임. 제목 줄과 본문을 선으로 나누고, 등장은 150ms 페이드만.
 * 크기는 내용에 맞추되 화면의 90% 를 넘지 않는다.
 *
 * 접근성은 Radix Dialog 가 맡는다(접근성 2 카드, 결정 2): 열리면 포커스가 안으로 들어가고 Tab 이 밖으로
 * 나가지 않는다. Esc 는 맨 위 모달만 닫는다. 닫히면 연 버튼으로 포커스가 돌아간다. 뒤 화면은 aria-hidden.
 * 배경 클릭으로는 닫지 않는다. 입력 중인 폼을 실수로 잃지 않게(우선순위 2).
 * 안의 팝업(드롭다운, 달력)은 이 틀 안으로 portal 된다(PopoverPortal). 팝업이나 충돌 안내가 떠 있으면
 * Esc 는 그 층만 닫는다. Radix 는 Esc 를 document 캡처 단계에서 먼저 받기 때문에 여기서 막아야 한다.
 */
const ModalContainer = ({
  children,
  title,
  width,
  height,
  onClose,
  returnFocusTo,
}: ModalContainerProps) => {
  const modalWidth = width || 'auto';
  const modalHeight = height || 'auto';
  // 팝업을 붙일 요소. state 여야 붙은 뒤 다시 그려 팝업이 이 요소를 받는다
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="fixed z-modal inset-0 flex items-center justify-center pointer-events-none">
        <Dialog.Content
          ref={setContentEl}
          // 본문 설명은 모달마다 달라 두지 않는다. 이름(제목)만으로 충분하다
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (contentEl?.querySelector(NESTED_LAYER_SELECTOR)) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // 모달을 연 요소가 아직 화면에 있으면 그리로(겹친 모달이면 아래 모달의 버튼)
            if (returnFocusTo?.isConnected) returnFocusTo.focus();
          }}
          className="flex flex-col border border-gray-200 shadow-xl bg-white rounded-xl relative pointer-events-auto animate-fadeIn focus:outline-none"
          style={{
            width: modalWidth,
            height: modalHeight,
            minWidth: '400px',
            maxWidth: '900px',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 제목 줄 */}
          <div className="flex justify-between items-center h-12 px-5 border-b border-gray-200 shrink-0">
            <Dialog.Title className="text-[15px] font-semibold text-gray-900">
              {title ?? '대화 상자'}
            </Dialog.Title>
            <Dialog.Close
              aria-label="닫기"
              className="w-8 h-8 -mr-2 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
            >
              <i aria-hidden="true" className="ri-close-line text-lg" />
            </Dialog.Close>
          </div>
          {/* 본문 */}
          <div className="p-5 flex-1 overflow-y-auto custom-scroll min-h-0">
            <PopoverRootContext.Provider value={contentEl}>{children}</PopoverRootContext.Provider>
          </div>
        </Dialog.Content>
      </div>
    </Dialog.Root>
  );
};

export default ModalContainer;
