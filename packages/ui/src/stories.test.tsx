import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react-vite';
import axe from 'axe-core';
import type { ReactElement } from 'react';

/**
 * 모든 스토리를 그리고(play 가 있으면 돌리고) axe 위반 0 을 본다(Storybook 1 카드).
 * 색 대비는 jsdom 이 스타일을 계산하지 못해 뺀다. 실제 브라우저의 대비는 e2e axe 가 본다.
 */
const modules = import.meta.glob('./**/*.stories.tsx', { eager: true });

type RunnableStory = (() => ReactElement | null) & {
  play?: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

const EXPECTED = [
  'Button',
  'ConflictDialog',
  'Dropdown',
  'IconButton',
  'Input',
  'ModalStatusBox',
  'Pagination',
  'SearchBar',
  'TabButtons',
  'Table',
];

describe('스토리', () => {
  it('공통 컴포넌트 10개에 스토리가 있다', () => {
    const names = Object.keys(modules)
      .map((path) => path.replace(/^\.\/(.*)\.stories\.tsx$/, '$1'))
      .sort();
    expect(names).toEqual(EXPECTED);
  });

  for (const [path, mod] of Object.entries(modules)) {
    // 합성된 스토리의 제네릭 타입은 모듈마다 달라 여기서 쓰는 모양(그리기, play)만 적는다
    const stories = Object.entries(
      composeStories(mod as Parameters<typeof composeStories>[0]),
    ) as unknown as [string, RunnableStory][];
    for (const [name, Story] of stories) {
      it(`${path} ${name}: 그려지고 play 가 통과하고 axe 위반 0`, async () => {
        const { container } = render(<Story />);
        await Story.play?.({ canvasElement: container });
        const result = await axe.run(container, {
          rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
        });
        expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual(
          [],
        );
      });
    }
  }
});
