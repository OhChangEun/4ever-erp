import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConflictDialog } from '@everp/ui';
import { IntlTestProvider } from '@/test/render';

const noop = () => undefined;

describe('충돌 안내 번역', () => {
  it.each([
    ['상품', '상품을'],
    ['창고', '창고를'],
    ['견적서', '견적서를'],
    ['BOM', 'BOM을'],
  ])('한국어 브리지도 %s의 받침에 맞는 조사를 쓴다', (subject, object) => {
    render(
      <IntlTestProvider locale="ko">
        <ConflictDialog subject={subject} onClose={noop} onReload={noop} />
      </IntlTestProvider>,
    );
    expect(
      screen.getByRole('alertdialog', { name: '수정 충돌이 발생했습니다' }),
    ).toHaveAccessibleDescription(
      `다른 사용자가 이미 이 ${object} 수정했습니다. 현재 화면의 데이터가 오래되어 수정 요청이 거부됐습니다.`,
    );
  });

  it('영어 설명과 호출부가 넘긴 대상은 그대로 유지한다', () => {
    render(
      <IntlTestProvider locale="en">
        <ConflictDialog subject="Warehouse" onClose={noop} onReload={noop} />
      </IntlTestProvider>,
    );
    expect(screen.getByRole('alertdialog', { name: 'Edit conflict' })).toHaveAccessibleDescription(
      'Another user has already changed this Warehouse. Your change was rejected because the data on this screen is out of date.',
    );
  });
});
