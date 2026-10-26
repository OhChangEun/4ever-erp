export const dropdownKeys = {
  all: ['dropdown'] as const,

  options: (name: string) => [...dropdownKeys.all, name] as const,
};
