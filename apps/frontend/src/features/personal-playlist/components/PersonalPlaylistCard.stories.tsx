// 라이브러리 카드의 커버 유무·긴 이름·0곡 표기를 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PersonalPlaylistCard } from './PersonalPlaylistCard';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

const base: PersonalPlaylistSummary = {
  coverUrl: null,
  description: '밤에 듣기 좋은 곡',
  id: 'pl-night-drive',
  itemCount: 12,
  name: '밤 드라이브',
  totalDuration: 3660,
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

export const WithCover: Story = {
  args: {
    playlist: {
      ...base,
      coverUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
    },
  },
};

export const SingleTrack: Story = {
  args: { playlist: { ...base, name: '한 곡짜리', itemCount: 1, totalDuration: 226 } },
};

export const Empty: Story = {
  args: { playlist: { ...base, name: '아직 비어있는 리스트', itemCount: 0, totalDuration: 0 } },
};

export const LongName: Story = {
  args: {
    playlist: {
      ...base,
      name: '아주 아주 아주 길어서 반드시 말줄임 처리가 되어야만 하는 플레이리스트 이름',
    },
  },
};

export const LongDuration: Story = {
  args: { playlist: { ...base, itemCount: 240, totalDuration: 54000 } },
};
