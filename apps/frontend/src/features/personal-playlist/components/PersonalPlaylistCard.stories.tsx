// 라이브러리 카드: 기본 표시와 긴 이름 말줄임을 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PersonalPlaylistCard } from './PersonalPlaylistCard';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

const base: PersonalPlaylistSummary = {
  createdAt: '2026-07-18T10:00:00.000Z',
  id: 'pl-night-drive',
  name: '밤 드라이브',
  updatedAt: '2026-07-20T12:00:00.000Z',
};

const meta = {
  title: 'Features/PersonalPlaylist/PersonalPlaylistCard',
  component: PersonalPlaylistCard,
  parameters: { layout: 'centered' },
  args: { playlist: base },
  decorators: [
    (Story) => (
      <div className="w-100 bg-background p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PersonalPlaylistCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongName: Story = {
  args: {
    playlist: {
      ...base,
      name: '아주 아주 아주 길어서 반드시 말줄임 처리가 되어야만 하는 플레이리스트 이름',
    },
  },
};
