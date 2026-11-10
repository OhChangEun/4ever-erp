import type { Meta, StoryObj } from '@storybook/react-vite';

/** 색 토큰 한눈에 보기(디자인 토큰 카드). 값은 packages/ui/tokens.css 가 원본이다 */
const PALETTES = ['blue', 'red', 'green', 'purple', 'gray'] as const;
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const ROLE: Record<(typeof PALETTES)[number], string> = {
  blue: '브랜드, 주 동작',
  red: '오류, 삭제',
  green: '승인, 정상',
  purple: '보조 강조',
  gray: '배경, 테두리, 글자',
};

function Palette() {
  return (
    <div className="space-y-5 p-4">
      {PALETTES.map((name) => (
        <section key={name} aria-label={`${name} 팔레트`}>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            {name} <span className="font-normal text-gray-500">{ROLE[name]}</span>
          </h2>
          <ul className="grid grid-cols-10 gap-1">
            {STEPS.map((step) => (
              <li key={step} className="text-center">
                <span
                  aria-hidden="true"
                  className="block h-10 rounded border border-gray-200"
                  style={{ backgroundColor: `var(--color-${name}-${step})` }}
                />
                <span className="text-xs text-gray-700 tabular-nums">{step}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: '디자인 토큰/색',
  component: Palette,
} satisfies Meta<typeof Palette>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {};
