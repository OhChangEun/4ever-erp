'use client';

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  readAllNotifications,
  readNotification,
} from '@/lib/api/notification.api';
import NotificationHeader from './NotificationHeader';
import NotificationPagination from './NotificationPagination';
import NotificationList from './NotificationList';
import ErrorMessage from '../../common/ErrorMessage';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sseUnreadCount, setSseUnreadCount] = useState<number | null>(null);
  const ITEMS_PER_PAGE = 3;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const queryClient = useQueryClient();

  // 알림 목록 조회
  const {
    data: notificationData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['notificationList', currentPage],
    queryFn: () => fetchNotifications(currentPage, ITEMS_PER_PAGE),
  });

  // // SSE 연결 (실시간 알림)
  // const { error } = useNotificationSSE({
  //   enabled: true,
  //   onAlarm: (alarm) => {
  //     console.log('New alarm received:', alarm);
  //     // 토스트 알림 등 추가 처리 가능
  //   },
  //   onUnreadCountChange: (count) => {
  //     setSseUnreadCount(count);
  //   },
  // });

  // 알림 전체 읽기
  const { mutate: readAll } = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationList'] });
      setCurrentPage(0);
    },
  });

  // 알림 하나 읽기
  const { mutate: readOne } = useMutation({
    mutationFn: (id: string) => readNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationList'] });
    },
  });

  const notifications = notificationData?.content ?? [];
  const pageInfo = notificationData?.page;

  // 읽지 않은 알림 개수 (SSE가 우선, 없으면 로컬 계산)
  const unreadCount =
    sseUnreadCount !== null ? sseUnreadCount : notifications.filter((n) => !n.isRead).length;

  const handleReadAll = () => {
    readAll();
  };

  const handleNotificationClick = (notificationId: string) => {
    readOne(notificationId);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="relative w-11 h-11 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors duration-200 cursor-pointer"
        aria-label="알림"
      >
        <i className="ri-notification-3-line text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-300 rounded-full flex-shrink-0"></span>
        )}
      </button>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-overlay overflow-hidden"
            >
              <NotificationHeader notificationCount={unreadCount} onReadAll={handleReadAll} />
              <NotificationList
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
              />
              {pageInfo && (
                <NotificationPagination page={pageInfo} onPageChange={handlePageChange} />
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
