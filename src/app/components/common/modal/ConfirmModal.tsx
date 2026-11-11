'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@everp/ui';
import { type ModalProps } from '@/app/components/common/modal/types';

interface ConfirmModalProps extends ModalProps {
  /**
   * 확인을 누르면 부른다. 인자는 사유(사유 칸이 없으면 빈 글자).
   * 돌려준 Promise 가 끝날 때까지 버튼을 잠그고, 성공하면 닫고, 실패하면 창과 입력을 그대로 둔다.
   * 실패 문구는 부르는 쪽이 보인다(도메인 mutation 훅의 onError 토스트). 훅의 `mutateAsync` 를 넘긴다.
   */
  onConfirm: (reason: string) => Promise<unknown>;
  /** 주면 필수 사유 칸을 보인다. required 는 비어 있을 때 칸 아래에 보이는 안내 */
  reason?: { label: string; required: string };
}

/**
 * 브라우저 기본 확인 창(window.confirm) 대신 쓰는 확인 모달. `openModal(ConfirmModal, { title: 질문 문장, onConfirm })` 로 연다.
 * 제목이 곧 질문이라 본문에는 버튼(과 사유 칸)만 둔다. 열리면 사유 칸, 없으면 취소 버튼에 포커스가 간다
 * (모달 틀이 data-autofocus 표시를 읽는다. React 의 autoFocus 는 겹친 모달에서 닫기 버튼에 밀린다).
 * 열자마자 Enter 를 눌러 승인이나 반려가 나가지 않게 처음 포커스를 확인 버튼에는 두지 않는다.
 */
export default function ConfirmModal({ onConfirm, reason, onClose }: ConfirmModalProps) {
  const t = useTranslations();
  const fieldId = useId();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const trimmed = text.trim();
  const reasonMissing = reason !== undefined && trimmed === '';

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      // 실패 문구는 onConfirm 쪽 토스트가 이미 보였다. 다시 누를 수 있게 잠금만 푼다
      setPending(false);
    }
  };

  return (
    <>
      {reason && (
        <div>
          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
            {reason.label}
          </label>
          <textarea
            id={fieldId}
            data-autofocus
            required
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={reasonMissing ? `${fieldId}-hint` : undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {reasonMissing && (
            <p id={`${fieldId}-hint`} className="mt-1 text-xs text-gray-600">
              {reason.required}
            </p>
          )}
        </div>
      )}
      <div className={`flex justify-end gap-2 ${reason ? 'mt-4' : ''}`}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          size="sm"
          data-autofocus={reason ? undefined : true}
          disabled={pending}
          onClick={onClose}
        />
        <Button
          label={t('ui.confirm')}
          size="sm"
          disabled={reasonMissing}
          loading={pending}
          onClick={() => void handleConfirm()}
        />
      </div>
    </>
  );
}
