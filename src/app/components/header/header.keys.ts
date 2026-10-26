export const notificationKeys = {
  all: ['notifications'] as const,

  lists: () => [...notificationKeys.all, 'list'] as const,

  list: (page: number) => [...notificationKeys.lists(), page] as const,
};

export const partnerProfileKeys = {
  all: ['partnerProfile'] as const,

  byRole: (role: string | undefined) => [...partnerProfileKeys.all, role] as const,
};
