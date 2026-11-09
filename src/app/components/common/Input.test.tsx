import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

/** 받은 이벤트의 name 과 값을 그대로 보여주는 부모 */
function Host({ type }: { type: 'tel' | 'number' | 'text' }) {
  const [state, setState] = useState({ name: '', value: '' });
  return (
    <>
      <Input
        aria-label="입력"
        name="phone"
        type={type}
        maxLength={5}
        value={state.value}
        onChange={(e) => setState({ name: e.target.name, value: e.target.value })}
      />
      <output>{`${state.name}|${state.value}`}</output>
    </>
  );
}

describe('Input 이 다듬은 값을 넘길 때', () => {
  it('전화번호는 하이픈을 넣고 name 을 잃지 않는다', async () => {
    render(<Host type="tel" />);
    await userEvent.type(screen.getByLabelText('입력'), '01012345678');
    expect(screen.getByRole('status')).toHaveTextContent('phone|010-1234-5678');
    expect(screen.getByLabelText('입력')).toHaveValue('010-1234-5678');
  });

  it('숫자는 길이 제한을 지키고 글자는 받지 않는다', async () => {
    render(<Host type="number" />);
    await userEvent.type(screen.getByLabelText('입력'), '12a3456');
    expect(screen.getByRole('status')).toHaveTextContent('phone|12345');
  });
});
