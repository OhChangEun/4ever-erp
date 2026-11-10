import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sparkline from './Sparkline';

describe('Sparkline', () => {
  it('점마다 꺾은선 좌표를 만들고, 요약을 그림 이름으로 준다', () => {
    const { container } = render(<Sparkline data={[10, 30, 20]} label="주간 매출 추이" />);
    const img = screen.getByRole('img', { name: /주간 매출 추이/ });
    expect(img).toHaveAccessibleName('주간 매출 추이: 시작 10, 끝 20, 최저 10, 최고 30');
    const points = container.querySelector('polyline')?.getAttribute('points')?.trim().split(' ');
    expect(points).toHaveLength(3);
  });

  it('점이 2개 미만이면 그리지 않는다', () => {
    const { container } = render(<Sparkline data={[5]} label="추이" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('값이 모두 같아도 좌표에 NaN 이 없다(높이 0 나눗셈)', () => {
    const { container } = render(<Sparkline data={[7, 7, 7, 7]} label="추이" />);
    expect(container.querySelector('polyline')?.getAttribute('points')).not.toContain('NaN');
  });
});
