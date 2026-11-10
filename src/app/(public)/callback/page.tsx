'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CallbackPage() {
  const t = useTranslations('auth.callback');
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 px-10 py-12 text-center space-y-6">
        <div
          className="mx-auto h-16 w-16 rounded-full border-4 border-t-transparent border-red-400 animate-spin"
          aria-hidden
        />
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{t('body')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-left text-sm text-slate-600 space-y-2">
          <p className="font-medium text-slate-900">{t('stepsTitle')}</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-red-400">•</span>
              <span>{t('stepPrepare')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-red-400">•</span>
              <span>{t('stepReturnTo')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-red-400">•</span>
              <span>{t('stepRedirect')}</span>
            </li>
          </ul>
        </div>
        <p className="text-xs text-slate-400" role="status" aria-live="polite">
          {t('stuck')}
        </p>
      </div>
    </div>
  );
}
