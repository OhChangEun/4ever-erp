import { useAuthStore } from '@/store/authStore';

export const useRole = () => {
  const userInfo = useAuthStore((state) => state.userInfo);
  // 로그인 전이면 빈 문자열. 역할 표(includes)와 바로 비교할 수 있게 string 으로 돌려준다
  return userInfo?.role ?? '';
};
