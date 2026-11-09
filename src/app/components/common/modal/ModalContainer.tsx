'use client';

import React from 'react';

interface ModalContainerProps {
  children: React.ReactNode;
  title?: string;
  width?: string;
  height?: string;
  onClose: () => void;
}

/**
 * 모달 프레임. 제목 줄과 본문을 선으로 나누고, 등장은 150ms 페이드만.
 * 크기는 내용에 맞추되 화면의 90% 를 넘지 않는다.
 */
const ModalContainer = ({ children, title, width, height, onClose }: ModalContainerProps) => {
  const modalWidth = width || 'auto';
  const modalHeight = height || 'auto';

  return (
    <div className="fixed z-modal inset-0 flex items-center justify-center pointer-events-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex flex-col border border-gray-200 shadow-xl bg-white rounded-xl relative pointer-events-auto animate-fadeIn"
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
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 -mr-2 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
          >
            <i aria-hidden="true" className="ri-close-line text-lg" />
          </button>
        </div>
        {/* 본문 */}
        <div className="p-5 flex-1 overflow-y-auto custom-scroll min-h-0">{children}</div>
      </div>
    </div>
  );
};

export default ModalContainer;
