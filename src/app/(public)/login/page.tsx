'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { persistAccessToken } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { buildMockUser, saveLoginId, DEMO_ACCOUNTS } from '@/lib/auth/simpleLogin';
import Button from '@/app/components/common/Button';
import Flex from '@/app/components/common/Flex';
import LogoMark from '@/app/components/header/LogoMark';

const VALID_IDS = new Set(DEMO_ACCOUNTS.map((a) => a.loginId.toUpperCase()));

export default function LoginPage() {
  const router = useRouter();
  const { setUserInfo } = useAuthStore();
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');

  function login(loginId: string) {
    const trimmed = loginId.trim();

    if (!trimmed) {
      setError('아이디를 입력해 주세요.');
      return;
    }

    if (!VALID_IDS.has(trimmed)) {
      setError('목록의 아이디를 선택하거나 올바른 아이디를 입력해 주세요.');
      return;
    }

    saveLoginId(trimmed);
    const user = buildMockUser(trimmed);

    persistAccessToken('demo-access-token', 60 * 60 * 24);
    setUserInfo(user);
    Cookies.set('role', user.role.toUpperCase(), { path: '/', sameSite: 'lax' });

    const returnTo = localStorage.getItem('oauth_return_to') || '/dashboard';
    localStorage.removeItem('oauth_return_to');
    router.replace(returnTo);
  }

  return (
    <Flex justify="center" align="center" className="min-h-screen bg-gray-50 px-4 pb-20">
      <Flex direction="col" gap={6} className="w-full max-w-2xl">
        {/* 로고 */}
        <Flex direction="col" align="center" gap={3} className="pl-2 pb-2">
          <LogoMark size={60} />

          <Flex align="center" gap={2}>
            <h1 className="text-2xl font-semibold text-slate-900">
              4Ever <span className="text-xl">간편 로그인</span>
            </h1>
          </Flex>

          <p className="text-sm text-gray-400">역할 카드를 선택하거나 아이디를 직접 입력하세요.</p>
        </Flex>

        {/* 역할 버튼 목록 */}
        <Flex direction="col" gap={2}>
          <Flex wrap gap={2}>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.loginId}
                type="button"
                onClick={() => {
                  setInputId(account.loginId.toUpperCase());
                  setError('');
                }}
                className={`group rounded-lg border px-4 py-3.5 text-left transition-colors w-full sm:w-[calc(50%-4px)] cursor-pointer ${
                  inputId === account.loginId.toUpperCase()
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <Flex align="center" gap={4}>
                  <i
                    className={`${account.icon} text-lg transition-colors shrink-0 ${
                      inputId === account.loginId.toUpperCase()
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <Flex direction="col" flex1 className="min-w-0">
                    <Flex align="baseline" gap={2}>
                      <span className="text-sm font-medium text-gray-800">
                        {account.displayName}
                      </span>
                      <span className="text-[13px] font-mono text-gray-400">{account.role}</span>
                    </Flex>
                    <p className="mt-1 text-xs text-gray-400 truncate">
                      {account.menus.join(' · ')}
                    </p>
                  </Flex>
                  <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors self-center shrink-0" />
                </Flex>
              </button>
            ))}
          </Flex>
        </Flex>

        {/* 입력 + 로그인 */}
        <Flex direction="col" gap={3} className="border-t border-gray-200 pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(inputId);
            }}
          >
            <Flex align="center" gap={2}>
              <input
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  if (error) setError('');
                }}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="아이디 입력"
                autoComplete="username"
              />
              <Button type="submit" label="로그인" variant="primary" size="sm" />
            </Flex>
          </form>
          {error ? <p className="pl-2 text-xs text-red-500">{error}</p> : null}
        </Flex>
      </Flex>
    </Flex>
  );
}
