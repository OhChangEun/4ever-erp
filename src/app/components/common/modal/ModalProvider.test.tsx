import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { IntlTestProvider } from '@/test/render';
import userEvent from '@testing-library/user-event';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';
import type { ModalProps } from './types';
import { Dropdown } from '@everp/ui';
import CalendarButton from '../CalendarButton';
import { ConflictDialog } from '@everp/ui';

function Inner({ onClose }: ModalProps) {
  return (
    <div>
      <input aria-label="안쪽 입력" />
      <button type="button" onClick={onClose}>
        안쪽 닫기
      </button>
    </div>
  );
}

function Outer({ onClose }: ModalProps) {
  const { openModal } = useModal();
  return (
    <div>
      <input aria-label="바깥 모달 입력" />
      <button type="button" onClick={() => openModal(Inner, { title: '두 번째' })}>
        하나 더 열기
      </button>
      <button type="button" onClick={onClose}>
        바깥 닫기
      </button>
    </div>
  );
}

function Page() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(Outer, { title: '첫 번째' })}>
      모달 열기
    </button>
  );
}

/** 처음 포커스를 받을 요소를 data-autofocus 로 표시한 모달. 표시한 요소가 첫 tabbable 이 아니다 */
function Marked(_: ModalProps) {
  return (
    <div>
      <input aria-label="첫 입력" />
      <input aria-label="표시한 입력" data-autofocus />
    </div>
  );
}

function MarkedPage() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(Marked, { title: '표시 있음' })}>
      표시 있는 모달 열기
    </button>
  );
}

/** 포커스가 버튼에 남은 채 같은 모달을 두 번 여는 경우(모달 틀 청크가 오기 전 Enter 두 번)를 한 핸들러로 흉내 낸다 */
function DoublePage() {
  const { openModal } = useModal();
  return (
    <button
      type="button"
      onClick={() => {
        openModal(Inner, { title: '한 번만' });
        openModal(Inner, { title: '한 번만' });
      }}
    >
      두 번 열기
    </button>
  );
}

/** 모달 안의 작은 층(드롭다운 목록, 달력, 충돌 안내)을 띄우는 폼 */
function FormWithLayers(_: ModalProps) {
  const [kind, setKind] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  return (
    <div className="relative">
      <Dropdown
        placeholder="유형"
        items={[
          { key: 'A', value: '원자재' },
          { key: 'B', value: '부품' },
        ]}
        value={kind}
        onChange={setKind}
      />
      <CalendarButton selectedDate={date} onDateChange={setDate} />
      <button type="button" onClick={() => setConflict(true)}>
        충돌 보기
      </button>
      {conflict && (
        <ConflictDialog subject="창고" onClose={() => setConflict(false)} onReload={() => {}} />
      )}
    </div>
  );
}

function LayerPage() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(FormWithLayers, { title: '폼' })}>
      폼 열기
    </button>
  );
}

function Broken(_: ModalProps): never {
  throw new Error('모달 안에서 깨짐');
}

function BrokenPage() {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(Broken, { title: '깨지는 모달' })}>
      깨지는 모달 열기
    </button>
  );
}

const setupLayers = async () => {
  render(
    <ModalProvider>
      <LayerPage />
    </ModalProvider>,
    { wrapper: IntlTestProvider },
  );
  await userEvent.click(screen.getByRole('button', { name: '폼 열기' }));
  // 모달 틀은 동적 import 라 처음 열 때 한 박자 늦게 뜬다
  return screen.findByRole('dialog', { name: '폼' });
};

const setup = async () => {
  render(
    <ModalProvider>
      <Page />
    </ModalProvider>,
    { wrapper: IntlTestProvider },
  );
  const trigger = screen.getByRole('button', { name: '모달 열기' });
  await userEvent.click(trigger);
  return { trigger, dialog: await screen.findByRole('dialog', { name: '첫 번째' }) };
};

describe('모달 중복 열기', () => {
  it('같은 버튼에서 같은 모달을 연달아 열어도 하나만 뜨고, 닫은 뒤에는 다시 열린다', async () => {
    render(
      <ModalProvider>
        <DoublePage />
      </ModalProvider>,
      { wrapper: IntlTestProvider },
    );
    const trigger = screen.getByRole('button', { name: '두 번 열기' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog', { name: '한 번만' });
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);

    // 하나를 닫으면 남는 모달이 없다. 닫은 뒤 같은 버튼에서 다시 열 수 있다
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(trigger);
    await screen.findByRole('dialog', { name: '한 번만' });
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
  });
});

describe('모달(포커스와 키보드)', () => {
  it('열리면 포커스가 모달 안으로 간다', async () => {
    const { dialog } = await setup();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('표시(data-autofocus)가 없는 모달은 예전처럼 첫 tabbable(닫기 버튼)에 포커스가 간다', async () => {
    const { dialog } = await setup();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus());
  });

  it('data-autofocus 로 표시한 요소가 있으면 열릴 때 그 요소에 포커스가 간다', async () => {
    render(
      <ModalProvider>
        <MarkedPage />
      </ModalProvider>,
      { wrapper: IntlTestProvider },
    );
    await userEvent.click(screen.getByRole('button', { name: '표시 있는 모달 열기' }));
    const dialog = await screen.findByRole('dialog', { name: '표시 있음' });
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: '표시한 입력' })).toHaveFocus(),
    );
  });

  it('Tab 을 계속 눌러도 포커스가 모달 밖으로 나가지 않는다', async () => {
    const { dialog } = await setup();
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('Esc 로 닫고 포커스를 연 버튼으로 돌린다', async () => {
    const { trigger } = await setup();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Radix 는 닫힌 다음 틱에 포커스를 돌려준다
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('모달이 겹치면 Esc 는 맨 위 모달만 닫는다', async () => {
    await setup();
    await userEvent.click(screen.getByRole('button', { name: '하나 더 열기' }));
    expect(screen.getByRole('dialog', { name: '두 번째' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '두 번째' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '첫 번째' })).toBeInTheDocument();
  });

  it('바깥(배경)을 눌러도 닫히지 않는다(입력 중인 폼을 잃지 않게)', async () => {
    await setup();
    // 모달이 열리면 뒤 화면은 pointer-events: none 이라 실제 사용자는 누를 수도 없다. 검사를 끄고 억지로 눌러 본다
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(document.body);
    expect(screen.getByRole('dialog', { name: '첫 번째' })).toBeInTheDocument();
  });

  // 리뷰 지적 P1: Radix 는 모달이 열리면 body 에 pointer-events: none 을 건다. body 로 portal 되는 목록은 못 누른다
  it('모달 안 드롭다운 목록의 항목을 누를 수 있다', async () => {
    const modal = await setupLayers();
    await userEvent.click(screen.getByRole('combobox', { name: '유형' }));
    await userEvent.click(screen.getByRole('option', { name: '부품' }));
    expect(screen.getByRole('combobox', { name: '유형' })).toHaveTextContent('부품');
    expect(modal).toContainElement(screen.getByRole('combobox', { name: '유형' }));
  });

  it('달력이 열려 있으면 Esc 는 달력만 닫는다', async () => {
    await setupLayers();
    await userEvent.click(screen.getByRole('button', { name: /날짜 선택/ }));
    expect(screen.getByRole('dialog', { name: '날짜 선택' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '날짜 선택' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '폼' })).toBeInTheDocument();
  });

  it('충돌 안내가 떠 있으면 Esc 는 안내만 닫는다', async () => {
    await setupLayers();
    await userEvent.click(screen.getByRole('button', { name: '충돌 보기' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '폼' })).toBeInTheDocument();
  });

  // 리뷰 지적 P2: 모달은 안쪽 층이 있으면 Esc 를 넘긴다. 드롭다운이 Esc 를 안 받으면 아무것도 안 닫힌다
  it('드롭다운이 열려 있으면 Esc 는 목록만 닫고, 한 번 더 누르면 모달을 닫는다', async () => {
    await setupLayers();
    await userEvent.click(screen.getByRole('combobox', { name: '유형' }));
    expect(screen.getByRole('option', { name: '부품' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '폼' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '폼' })).not.toBeInTheDocument();
  });

  // 옵저버빌리티 1: 모달 안에서 던져도 화면 전체가 오류 페이지로 바뀌지 않는다
  it('모달 안 컴포넌트가 던지면 그 모달만 오류로 바뀌고 닫을 수 있다', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ModalProvider>
        <BrokenPage />
      </ModalProvider>,
      { wrapper: IntlTestProvider },
    );
    await userEvent.click(screen.getByRole('button', { name: '깨지는 모달 열기' }));
    const dialog = await screen.findByRole('dialog', { name: '깨지는 모달' });
    expect(dialog).toHaveTextContent('이 창을 그리는 중 오류가 발생했습니다');
    await userEvent.click(within(dialog).getByRole('button', { name: '창 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '깨지는 모달 열기' })).toBeInTheDocument();
    spy.mockRestore();
  });

  // 오류 경계 영어 카드: 모달 경계의 대체 화면도 화면 언어를 따른다
  it('영어 화면에서 모달 안 컴포넌트가 던지면 영어 문구로 바뀌고 닫을 수 있다', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ModalProvider>
        <BrokenPage />
      </ModalProvider>,
      {
        wrapper: ({ children }) => <IntlTestProvider locale="en">{children}</IntlTestProvider>,
      },
    );
    await userEvent.click(screen.getByRole('button', { name: '깨지는 모달 열기' }));
    const dialog = await screen.findByRole('dialog', { name: '깨지는 모달' });
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong while showing this window.');
    expect(alert).not.toHaveTextContent(/[가-힣]/);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close window' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
