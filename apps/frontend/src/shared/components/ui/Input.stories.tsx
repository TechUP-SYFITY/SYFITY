import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
  argTypes: {
    size: { control: 'inline-radio', options: ['md', 'lg'] },
    error: { control: 'text' },
    helperText: { control: 'text' },
    showCount: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { placeholder: '방 이름을 입력하세요' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export const Default: Story = {};

export const WithLeadingIcon: Story = {
  args: {
    placeholder: 'YouTube 검색 또는 링크 붙여넣기',
    leadingIcon: <SearchIcon />,
  },
};

export const WithCounter: Story = {
  args: {
    placeholder: '초대 코드 입력 (예: 3F9A2C)',
    maxLength: 6,
    showCount: true,
    defaultValue: '3F9A',
  },
};

export const HelperText: Story = {
  args: {
    placeholder: '방 이름',
    helperText: '방에 참여한 사람들에게 보여요',
  },
};

export const ErrorState: Story = {
  args: {
    placeholder: '초대 코드 입력 (예: 3F9A2C)',
    defaultValue: 'XXXXXX',
    error: '유효하지 않은 초대 코드예요. 다시 확인해주세요.',
    maxLength: 6,
    showCount: true,
  },
};

// Room 진입 초대 코드: lg 사이즈 + 가운데 정렬(className) + 카운터
export const CodeInput: Story = {
  args: {
    size: 'lg',
    className: 'text-center tracking-wide',
    placeholder: '예: 3F9A2C',
    maxLength: 6,
    showCount: true,
  },
};

export const Disabled: Story = {
  args: { placeholder: '입력 비활성', disabled: true },
};
