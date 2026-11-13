import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

/** 드롭다운(combobox)을 열어 항목 글자를 읽고 닫는다 */
export const optionTexts = async (
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
): Promise<string[]> => {
  await user.click(combobox);
  const list = await screen.findByRole('listbox');
  const texts = within(list)
    .getAllByRole('option')
    .map((option) => option.textContent);
  await user.keyboard('{Escape}');
  return texts;
};

/** 화면의 드롭다운 전부를 열어 한글이 든 항목 글자를 모은다. 서버 데이터 드롭다운은 skip 이름으로 뺀다 */
export const hangulOptions = async (
  user: ReturnType<typeof userEvent.setup>,
  skip: string[] = [],
): Promise<string[]> => {
  const found: string[] = [];
  for (const combobox of screen.getAllByRole('combobox')) {
    if (skip.includes(combobox.getAttribute('aria-label') ?? '')) continue;
    found.push(...(await optionTexts(user, combobox)).filter((text) => /[가-힣]/.test(text)));
  }
  return found;
};
