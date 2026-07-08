// Room 초대 코드 입장 화면의 PC, 모바일, 상태별 UI를 검증한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RoomJoinView } from './RoomJoinView';

const noop = () => undefined;

const meta = {
  title: 'Room/RoomJoinView',
  component: RoomJoinView,
  parameters: { layout: 'fullscreen' },
  args: {
    code: '',
    state: 'default',
    onCancel: noop,
    onCodeChange: noop,
    onSubmit: noop,
  },
} satisfies Meta<typeof RoomJoinView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInviteCode: Story = {
  args: { code: '3F9A2C' },
};

export const Loading: Story = {
  args: { code: '3F9A2C', state: 'loading' },
};

export const InvalidCode: Story = {
  args: { code: 'XK29ZQ', state: 'invalid-code' },
};

export const ClosedRoom: Story = {
  args: { code: '3F9A2C', state: 'closed' },
};

export const InactiveRoom: Story = {
  args: { code: '3F9A2C', state: 'inactive' },
};

export const MobileDefault: Story = {
  args: { code: '' },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
