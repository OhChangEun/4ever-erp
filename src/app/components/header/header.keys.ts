// 목록과 안 읽은 수가 같은 뿌리(all) 아래에 있다. SSE 새 알림은 all 을 무효화해 둘을 같이 다시 받는다
export const notificationKeys = {
  all: ['notifications'] as const,

  lists: () => [...notificationKeys.all, 'list'] as const,

  list: (page: number) => [...notificationKeys.lists(), page] as const,

  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

export const partnerProfileKeys = {
  all: ['partnerProfile'] as const,

  byRole: (role: string | undefined) => [...partnerProfileKeys.all, role] as const,
};
