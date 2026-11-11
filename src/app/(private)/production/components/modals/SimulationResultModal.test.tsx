import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import SimulationResultModal from './SimulationResultModal';
import type { QuotationSimulationData } from '../../types/QuotationSimulationApiType';

const result: QuotationSimulationData = {
  quotationId: 'q-1',
  quotationNumber: 'QT-2026-001',
  customerCompanyId: 'cus-001',
  customerCompanyName: '한빛전자',
  productId: 'prod-001',
  productName: '모터 A',
  requestQuantity: 1200,
  // 정오 UTC 라 어느 시간대에서도 1월 15일
  requestDueDate: Date.UTC(2026, 0, 15, 12),
  simulation: {
    status: 'PASS',
    availableQuantity: 10,
    shortageQuantity: 0,
    shortageReason: '',
    suggestedDueDate: '2026-02-15',
    generatedAt: '2026-11-11T01:00:00Z',
  },
};

const renderModal = (locale: 'ko' | 'en' = 'ko') =>
  renderWithProviders(
    <SimulationResultModal
      id="m"
      onClose={() => {}}
      simulationResults={[result]}
      onConfirm={() => {}}
    />,
    { locale },
  );

/** 요청 납기 날짜는 화면 언어를 따른다 */
describe('시뮬레이션 결과 요청 납기', () => {
  it('영어 화면이면 영어 날짜', () => {
    renderModal('en');
    expect(screen.getByText('1/15/2026')).toBeInTheDocument();
  });

  it('한국어 화면은 예전과 같다', () => {
    renderModal();
    expect(screen.getByText('2026. 1. 15.')).toBeInTheDocument();
  });
});

/** 남은 표시 결함 3 카드. 응답에 단위 필드가 없어 EA 로 보고, 글자는 영업 결정(개, pcs)을 따른다 */
describe('시뮬레이션 결과 수량 단위', () => {
  it('한국어는 개', () => {
    renderModal();
    expect(screen.getByText('1,200개')).toBeInTheDocument();
    expect(screen.queryByText(/EA/)).not.toBeInTheDocument();
  });

  it('영어는 pcs', () => {
    renderModal('en');
    expect(screen.getByText('1,200 pcs')).toBeInTheDocument();
    expect(screen.queryByText(/EA/)).not.toBeInTheDocument();
  });
});
