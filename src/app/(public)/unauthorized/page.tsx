'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@everp/ui';

export default function UnauthorizedPage() {
  const t = useTranslations('auth.unauthorized');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 text-center">
      <div className="max-w-lg w-full rounded-lg border border-gray-200 bg-white p-10 space-y-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 text-3xl">
          <i className="ri-error-warning-line text-3xl text-red-500" aria-hidden="true"></i>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">{t('title')}</h1>
          <p className="text-slate-600 leading-relaxed">{t('body')}</p>
        </div>
        <div className="border-t border-gray-200 pt-6 text-left text-sm text-slate-600 space-y-3">
          <p className="font-medium text-slate-900">{t('checkTitle')}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-red-400">•</span>
              <span>{t('checkAccount')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-red-400">•</span>
              <span>{t('checkRequest')}</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            label={t('back')}
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          />
          {/* shortcut: 공통 Button primary 클래스를 옮겨 적었다. Button 이 링크(href, asChild)를 받게 되면 그것으로 바꾼다 */}
          <Link
            href="/"
            className="inline-flex h-9 w-full sm:w-auto items-center justify-center rounded-md bg-blue-500 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
