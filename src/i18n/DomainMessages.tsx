'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import type { Locale } from './locale';

type Tree = Record<string, unknown>;

/**
 * 도메인 메시지(i18n 2 카드). 공통 메시지(IntlProvider)에 이 도메인 메시지를 합쳐 아래로 넘긴다.
 * 한국어는 도메인 레이아웃이 정적으로 가져와 그 화면 청크에만 실린다(모든 화면 첫 로드가 아니라).
 * 다른 언어는 고를 때만 받는다. 받기 전에는 한국어를 보인다(빈 글자를 보이지 않는다).
 */
export default function DomainMessages({
  namespace,
  ko,
  load,
  children,
}: {
  namespace: string;
  ko: Tree;
  load: Record<Exclude<Locale, 'ko'>, () => Promise<{ default: Tree }>>;
  children: ReactNode;
}) {
  const locale = useLocale();
  const outer = useMessages();
  const [loaded, setLoaded] = useState<Partial<Record<Locale, Tree>>>({ ko });

  useEffect(() => {
    if (locale === 'ko' || loaded[locale]) return;
    let cancelled = false;
    void load[locale]().then((module) => {
      if (!cancelled) setLoaded((prev) => ({ ...prev, [locale]: module.default }));
    });
    return () => {
      cancelled = true;
    };
  }, [locale, loaded, load]);

  const own = loaded[locale] ?? ko;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ ...outer, [namespace]: own }}
      timeZone="Asia/Seoul"
    >
      {children}
    </NextIntlClientProvider>
  );
}
