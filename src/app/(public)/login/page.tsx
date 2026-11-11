'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { DEMO_ACCOUNTS, findDemoAccount } from '@/lib/auth/simpleLogin';
import { readErrorMessage, readUserResponse } from '@/lib/auth/userInfo';
import { safeReturnTo } from '@/lib/auth/returnTo';
import { Button } from '@everp/ui';
import { Flex } from '@everp/ui';
import LogoMark from '@/app/components/header/LogoMark';

// middleware가 붙여준 returnTo - 같은 사이트 안의 경로만 허용
function readReturnTo(): string {
  if (typeof window === 'undefined') return '/dashboard';
  return safeReturnTo(new URLSearchParams(window.location.search).get('returnTo'));
}

// AUTH_PROVIDER=oidc 로 띄우면 데모 계정 대신 IdP 로그인 버튼 하나만 보인다(인증 4단계 카드)
const IS_OIDC = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oidc';

// IdP 가 돌려준 오류 코드 → 메시지 키(login.oidcError). 모르는 코드는 unknown
const OIDC_ERROR_KEYS = [
  'access_denied',
  'no_role',
  'invalid_transaction',
  'state_mismatch',
] as const;
type OidcErrorKey = (typeof OIDC_ERROR_KEYS)[number] | 'unknown';

function readOidcError(): OidcErrorKey | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get('error');
  if (!code) return null;
  return OIDC_ERROR_KEYS.find((key) => key === code) ?? 'unknown';
}

// 데모 로그인 오류. 화면 문구는 키로, 서버가 준 문구는 그대로 보인다
type DemoErrorKey = 'empty' | 'unknownId' | 'failed' | 'badResponse' | 'network';
type DemoError = { key: DemoErrorKey } | { text: string } | null;

function OidcLogin() {
  const t = useTranslations('login');
  const [error] = useState(readOidcError);
  const startLogin = () => {
    // 서버가 state, nonce, PKCE 를 만들고 IdP 로 302 한다. Next 페이지가 아니라 라우트 핸들러라
    // 클라이언트 라우터 대신 전체 페이지 이동을 한다
    const url = new URL('/api/auth/login', window.location.origin);
    url.searchParams.set('returnTo', readReturnTo());
    window.location.assign(url.toString());
  };
  return (
    <Flex justify="center" align="center" className="min-h-screen bg-gray-50 px-4 pb-20">
      <Flex direction="col" align="center" gap={4} className="w-full max-w-sm">
        <LogoMark size={60} />
        <h1 className="text-2xl font-semibold text-slate-900">{t('oidcTitle')}</h1>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {t(`oidcError.${error}`)}
          </p>
        )}
        <Button label={t('companyAccount')} onClick={startLogin} className="w-full" />
      </Flex>
    </Flex>
  );
}

export default function LoginPage() {
  if (IS_OIDC) return <OidcLogin />;
  return <DemoLogin />;
}

function DemoLogin() {
  const t = useTranslations('login');
  const router = useRouter();
  const { setUserInfo } = useAuthStore();
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState<DemoError>(null);
  const [pending, setPending] = useState(false);

  async function login(loginId: string) {
    const trimmed = loginId.trim();

    if (!trimmed) {
      setError({ key: 'empty' });
      return;
    }

    // 서버와 같은 함수로 판정한다(대소문자, 앞뒤 공백 무시)
    if (!findDemoAccount(trimmed)) {
      setError({ key: 'unknownId' });
      return;
    }

    // 로그인은 서버가 처리한다 - 세션은 httpOnly 쿠키로 오고, 브라우저 JS는 그 값을 볼 수 없다
    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: trimmed }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const message = readErrorMessage(body);
        setError(message ? { text: message } : { key: 'failed' });
        return;
      }

      const user = readUserResponse(await res.json());
      if (!user) {
        setError({ key: 'badResponse' });
        return;
      }
      setUserInfo(user);
      router.replace(readReturnTo());
    } catch {
      setError({ key: 'network' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Flex justify="center" align="center" className="min-h-screen bg-gray-50 px-4 pb-20">
      <Flex direction="col" gap={6} className="w-full max-w-2xl">
        {/* 로고 */}
        <Flex direction="col" align="center" gap={3} className="pl-2 pb-2">
          <LogoMark size={60} />

          <Flex align="center" gap={2}>
            <h1 className="text-2xl font-semibold text-slate-900">
              4Ever <span className="text-xl">{t('demoTitle')}</span>
            </h1>
          </Flex>

          <p className="text-sm text-gray-500">{t('demoHint')}</p>
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
                  setError(null);
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
                        {t(`account.${account.displayNameKey}`)}
                      </span>
                      <span className="text-[13px] font-mono text-gray-500">{account.role}</span>
                    </Flex>
                    <p className="mt-1 text-xs text-gray-500 truncate">
                      {account.menus.map((menu) => t(`menu.${menu}`)).join(' · ')}
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
              void login(inputId);
            }}
          >
            <Flex align="center" gap={2}>
              <input
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  if (error) setError(null);
                }}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder={t('idPlaceholder')}
                autoComplete="username"
              />
              <Button
                type="submit"
                label={t('submit')}
                variant="primary"
                size="sm"
                disabled={pending}
              />
            </Flex>
          </form>
          {error ? (
            <p className="pl-2 text-xs text-red-500">
              {'key' in error ? t(`error.${error.key}`) : error.text}
            </p>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  );
}
