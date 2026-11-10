'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function UnauthorizedPage() {
  const t = useTranslations('auth.unauthorized');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center px-4 py-12 text-center">
      <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-10 space-y-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 text-3xl">
          <i className="ri-error-warning-line text-3xl text-red-500" aria-hidden="true"></i>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">{t('title')}</h1>
          <p className="text-slate-600 leading-relaxed">{t('body')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left text-sm text-slate-600 space-y-3">
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
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {t('back')}
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
