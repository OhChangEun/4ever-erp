'use client';

import { useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { UiTextProvider, koreanObjectParticle, type UiText } from '@everp/ui';

/**
 * @everp/ui 가 스스로 그리는 글자(쪽 넘김 aria, 표의 빈 줄, 충돌 안내 등)를 앱 메시지 `ui` 로 넘긴다.
 * 패키지는 라이브러리로도 빌드돼 next-intl 을 모른다. 그래서 패키지는 글자 모양(UiText)과 Provider 만 두고,
 * 번역은 앱이 이 다리 하나로 넣는다. 호출부(Pagination 25곳, Table 23곳 등)는 바꾸지 않는다.
 * 언어 provider(IntlProvider) 바로 아래에 둔다. 도메인 provider(DomainMessages)는 공통 메시지를 그대로 합쳐 `ui` 가 같다.
 * 번역 함수가 같으면 값을 재사용한다. 부모가 다시 그려져도 같은 값으로 소비자를 갱신하지 않는다.
 */
export default function UiTextBridge({ children }: { children: ReactNode }) {
  const t = useTranslations('ui');
  const text = useMemo<UiText>(
    () => ({
      close: t('close'),
      confirm: t('confirm'),
      pagination: {
        label: t('pagination.label'),
        previous: t('pagination.previous'),
        next: t('pagination.next'),
        // 숫자는 글자로 넘긴다. 예전처럼 자릿수 구분 없이 보인다
        total: (count, emphasize) =>
          t.rich('pagination.total', { count: String(count), num: emphasize }),
      },
      simplePagination: {
        previous: t('simplePagination.previous'),
        next: t('simplePagination.next'),
      },
      table: { empty: t('table.empty') },
      dropdown: { empty: t('dropdown.empty') },
      searchBar: {
        typePlaceholder: t('searchBar.typePlaceholder'),
        keywordPlaceholder: t('searchBar.keywordPlaceholder'),
      },
      loading: { message: t('loading.message'), subMessage: t('loading.subMessage') },
      error: { title: t('error.title'), unknown: t('error.unknown') },
      conflict: {
        title: t('conflict.title'),
        description: (subject) =>
          t('conflict.description', { subject, particle: koreanObjectParticle(subject) }),
        hint: t('conflict.hint'),
        reload: t('conflict.reload'),
      },
      sparkline: {
        summary: (label, values) => t('sparkline.summary', { label, ...values }),
      },
      inputList: {
        title: t('inputList.title'),
        add: t('inputList.add'),
        remove: (position) => t('inputList.remove', { position: String(position) }),
        item: (position) => t('inputList.item', { position: String(position) }),
      },
      dropdownInputModal: { open: t('dropdownInputModal.open') },
      dropdownInputListModal: { open: t('dropdownInputListModal.open') },
    }),
    [t],
  );
  return <UiTextProvider text={text}>{children}</UiTextProvider>;
}
