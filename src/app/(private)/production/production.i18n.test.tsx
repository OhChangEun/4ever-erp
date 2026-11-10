import { beforeAll, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/messages/en.json';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';
import ProductionClient from './ProductionClient';
import ProductionLayout from './layout';
import BomTab from './components/tabs/BomTab';
import MesTab from './components/tabs/MesTab';
import QuotationTab from './components/tabs/QuotationTab';
import MesGantt from './components/MesGantt';
import BomCostTree from './components/bom/BomCostTree';
import type { BomLevelStructureNode } from './types/BomDetailApiType';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/production',
}));

// 레이아웃 시험용. 앱 Providers 는 MSW 켜기와 개발 도구까지 들고 있어 테스트와 같은 것만 남긴다
vi.mock('@/app/(private)/_RouteProviders', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  ),
}));

// jsdom 에는 scrollTo 가 없다. MES 표가 진행 중 공정으로 가로 스크롤한다
beforeAll(() => {
  Element.prototype.scrollTo = () => {};
});

const ganttRows = [
  {
    mesId: 'mes-1',
    mesNumber: 'MES-1',
    productName: '모터 A',
    startDate: '2026-11-01',
    endDate: '2026-11-08',
    status: 'IN_PROGRESS',
    progressRate: 60,
  },
];
const TODAY = new Date(2026, 10, 10);

const node = (
  id: string,
  name: string,
  parentId: string | null,
  quantity: number | null,
  unitCost?: number | null,
): BomLevelStructureNode => ({
  id,
  code: id,
  name,
  quantity,
  unit: 'EA',
  level: parentId ? 1 : 0,
  parentId,
  unitCost,
});
const bomData = [
  node('r', '모터', null, null),
  node('asm', '하우징 조립', 'r', 2),
  node('a', '알루미늄 판', 'asm', 3, 100),
  node('b', '볼트', 'asm', 1, 400),
  node('c', '샤프트', 'r', 1, null),
];

describe('생산 화면 영어(i18n 9)', () => {
  it('탭 이름과 통계 카드 제목이 영어, 건수에 단위 "건"이 붙지 않는다', async () => {
    renderWithProviders(<ProductionClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('Items in production')).toBeInTheDocument();
    expect(within(metrics).getByText('BOMs')).toBeInTheDocument();
    expect(within(metrics).queryByText(/건/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quotes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MES' })).toBeInTheDocument();
  });

  it('한국어 탭과 통계 카드는 예전과 같다(1,200건)', async () => {
    renderWithProviders(<ProductionClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(await within(metrics).findByText('생산 중인 품목')).toBeInTheDocument();
    expect(within(metrics).getByText('BOM 개수')).toBeInTheDocument();
    expect(within(metrics).getAllByText('1,200건').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '견적 관리' })).toBeInTheDocument();
  });

  it('BOM 목록과 상세 모달(원가 트리 포함)이 영어', async () => {
    renderWithProviders(<BomTab />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'BOM no.' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View details' }));
    const dialog = await screen.findByRole('dialog', { name: 'BOM details' });
    expect(await within(dialog).findByText('Components')).toBeInTheDocument();
    // 서버 상태 값 '활성'은 그대로 보내고 버튼 글자만 바뀐다
    expect(within(dialog).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(await within(dialog).findByRole('group', { name: 'BOM cost tree' })).toBeInTheDocument();
    expect(within(dialog).getByText('Run time (min)')).toBeInTheDocument();
  });

  it('MES 목록의 보기 전환, 표 머리, 상세 모달이 영어(소요시간 2 h)', async () => {
    renderWithProviders(<MesTab />, { locale: 'en' });
    expect(await screen.findByRole('columnheader', { name: 'Progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gantt' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('row')[1]);
    const dialog = await screen.findByRole('dialog', { name: 'MES status' });
    expect(await within(dialog).findByText('Work order: MES-2026-001')).toBeInTheDocument();
    expect(within(dialog).getByText('2 h')).toBeInTheDocument();
    expect(within(dialog).getByText('Step 1')).toBeInTheDocument();
  });

  it('한국어 MES 상세는 예전과 같다(2시간, 공정 순서)', async () => {
    renderWithProviders(<MesTab />);
    await screen.findByRole('columnheader', { name: '진행률' });
    await userEvent.click(screen.getAllByRole('row')[1]);
    const dialog = await screen.findByRole('dialog', { name: 'MES 현황' });
    expect(await within(dialog).findByText('작업지시: MES-2026-001')).toBeInTheDocument();
    expect(within(dialog).getByText('2시간')).toBeInTheDocument();
    expect(within(dialog).getByText('공정 순서: 1')).toBeInTheDocument();
  });
});

describe('MES 간트와 BOM 원가 트리 영어(i18n 9)', () => {
  it('간트 목록 이름, 막대 이름, 지연, 오늘이 영어', () => {
    renderWithProviders(<MesGantt rows={ganttRows} today={TODAY} onSelect={() => {}} />, {
      locale: 'en',
    });
    expect(
      screen.getByRole('list', { name: 'MES work order schedule (Gantt)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveAccessibleName(
      'MES-1 모터 A, 2026-11-01 to 2026-11-08, 60% done, late',
    );
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('한국어 간트 막대 이름은 예전과 같다(헬퍼에서 화면으로 옮긴 글자)', () => {
    renderWithProviders(<MesGantt rows={ganttRows} today={TODAY} onSelect={() => {}} />);
    expect(screen.getByRole('listitem')).toHaveAccessibleName(
      'MES-1 모터 A, 2026-11-01~2026-11-08, 진행 60%, 지연',
    );
  });

  it('원가 트리 요약, 노드 이름, 표가 영어', async () => {
    renderWithProviders(<BomCostTree bomData={bomData} />, { locale: 'en' });
    const summary = screen.getByText(/Material cost per finished good/);
    expect(summary).toHaveTextContent('at least ₩1,400');
    expect(summary).toHaveTextContent('1 material has no unit cost and was not counted as 0.');
    expect(
      screen.getByRole('button', {
        name: /^하우징 조립, 2EA, .* per finished good, 2 children expanded$/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('No unit cost')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table', { name: 'BOM cost table' });
    expect(
      within(table).getByRole('columnheader', { name: 'Per finished good' }),
    ).toBeInTheDocument();
    expect(within(table).getByText('Finished good')).toBeInTheDocument();
  });

  it('한국어 원가 트리 노드 이름은 예전과 같다', () => {
    renderWithProviders(<BomCostTree bomData={bomData} />);
    expect(
      screen.getByRole('button', {
        name: /^하우징 조립, 2EA, 완제품 1개당 ₩\d[\d,]*\(\d+%\), 하위 2개 펼침$/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/비중 큰 자재: 볼트 ₩800\(\d+%\), 알루미늄 판/)).toBeInTheDocument();
  });
});

describe('생산 레이아웃(i18n 9)', () => {
  it('생산 레이아웃이 생산 메시지를 준다. 시뮬레이션 결과 모달 안 문구도 영어', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Seoul">
        <ProductionLayout>
          <QuotationTab />
        </ProductionLayout>
      </NextIntlClientProvider>,
    );
    // 영어 메시지는 받은 뒤에 바뀐다
    expect(await screen.findByRole('columnheader', { name: 'Quote no.' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select QT-2025-001' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simulate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Simulation results' });
    expect(await within(dialog).findByText('Production review')).toBeInTheDocument();
    expect(within(dialog).getByText('Quantity breakdown')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create MPS' })).toBeInTheDocument();
  });
});
