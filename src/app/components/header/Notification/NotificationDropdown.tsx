'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, SimplePagination } from '@everp/ui';
import TableStatusBox from '@/app/components/common/TableStatusBox';
import { fetchNotifications } from '@/lib/api/notification.api';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import NotificationHeader from './NotificationHeader';
import NotificationList from './NotificationList';
import { notificationKeys } from '../header.keys';
import { useReadAllNotifications, useReadNotification } from '../notification.mutations';

const ITEMS_PER_PAGE = 3;

interface NotificationDropdownProps {
  /** 사이드바 뱃지와 같은 값. 조회 실패면 undefined */
  unreadCount: number | undefined;
  /** SSE 가 없을 때의 다시 받기 간격. 뱃지와 같은 값을 써서 둘이 같이 바뀐다 */
  refetchInterval: number | false;
  /** 포커스를 팝오버 틀로 옮긴다. 읽고 나면 누른 버튼이 사라져서 쓴다 */
  focusPanel: () => void;
}

/**
 * 알림 팝오버의 내용(머리, 목록, 쪽 넘김, 실패 표시). 알림 버튼을 누를 때 받는 청크다.
 * 틀(dialog)과 닫기는 NotificationBell 에 있다.
 */
export default function NotificationDropdown({
  unreadCount,
  refetchInterval,
  focusPanel,
}: NotificationDropdownProps) {
  const t = useTranslations('notification');
  const errorMessageOf = useErrorMessage();
  const [currentPage, setCurrentPage] = useState(0);

  const { data, error, isPending, isError, refetch } = useQuery({
    queryKey: notificationKeys.list(currentPage),
    queryFn: () => fetchNotifications(currentPage, ITEMS_PER_PAGE),
    refetchInterval,
    placeholderData: keepPreviousData,
  });

  // 읽음 처리의 무효화(목록, 안 읽은 수)는 notification.mutations.ts 한 곳.
  // 읽고 나면 누른 버튼(안 읽은 알림, 전체 읽음)이 사라져 포커스를 잃는다. 팝오버 틀로 옮겨 둔다
  const readAll = useReadAllNotifications({
    onSuccess: () => {
      setCurrentPage(0);
      focusPanel();
    },
  });
  const readOne = useReadNotification({ onSuccess: focusPanel });
  const readError = readOne.error ?? readAll.error;
  // 공통 빌더는 진행 중인 요청이 있으면 두 번째 호출을 버린다. 그동안 항목을 흐리게 해 눌러도 안 되는 걸 보인다
  const reading = readOne.isPending || readAll.isPending;

  const notifications = data?.content ?? [];
  const totalPages = data?.page.totalPages ?? 1;

  return (
    <>
      <NotificationHeader
        // 안 읽은 수를 못 받았으면 지금 쪽의 안 읽은 항목으로 전체 읽음 버튼을 정한다
        notificationCount={unreadCount ?? notifications.filter((n) => !n.isRead).length}
        onReadAll={() => {
          readOne.reset();
          readAll.mutate();
        }}
      />
      {readError && (
        <p role="alert" className="px-5 py-2 text-xs text-red-600 border-b border-gray-100">
          {t('readFailed')} {errorMessageOf(readError)}
        </p>
      )}
      {isPending ? (
        <div className="p-3">
          <TableStatusBox type="loading" message={t('loading')} />
        </div>
      ) : isError ? (
        <div className="p-3 flex flex-col items-center gap-3">
          <div className="w-full">
            <TableStatusBox type="error" message={t('loadFailed')} error={error} />
          </div>
          <Button label={t('retry')} variant="secondary" size="sm" onClick={() => void refetch()} />
        </div>
      ) : (
        <>
          <NotificationList
            notifications={notifications}
            disabled={reading}
            onNotificationClick={(notificationId) => {
              readAll.reset();
              readOne.mutate(notificationId);
            }}
          />
          {totalPages > 1 && (
            <SimplePagination
              currentPage={currentPage + 1}
              totalPages={totalPages}
              onPageChange={(next) => setCurrentPage(next - 1)}
            />
          )}
        </>
      )}
    </>
  );
}
