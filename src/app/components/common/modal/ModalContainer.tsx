'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalContainerProps {
  children: React.ReactNode;
  title?: string;
  width?: string;
  height?: string;
  onClose: () => void;
}

const ModalContainer = ({ children, title, width, height, onClose }: ModalContainerProps) => {
  const modalWidth = width || 'auto';
  const modalHeight = height || 'auto';

  return (
    <AnimatePresence>
      <div className="fixed z-modal inset-0 flex items-center justify-center pointer-events-auto">
        <motion.div
          className="flex flex-col border border-gray-200 shadow-2xl bg-white rounded-2xl p-6 relative pointer-events-auto"
          style={{
            width: modalWidth,
            height: modalHeight,
            minWidth: '400px',
            minHeight: '380px',
            maxWidth: '900px',
            maxHeight: '90vh',
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더: title + 닫기 버튼 */}
          <div className="flex justify-between items-center shrink-0">
            <h2 className="pl-2 pt-2 text-gray-800 text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="pr-1 text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          {/* 모달 본문 */}
          <div className="pt-6 flex-1 overflow-y-auto custom-scroll min-h-0">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ModalContainer;
