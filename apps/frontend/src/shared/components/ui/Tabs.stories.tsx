import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div className="w-96">{Story()}</div>],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 모바일 Room: 재생목록 / 멤버 / 채팅
export const RoomMobile: Story = {
  render: () => (
    <Tabs defaultValue="playlist">
      {/* 모바일 Room 바: 전체폭 균등(flex-1) + 상하 테두리 + 배경은 사용처에서 지정 */}
      <TabsList className="border-y bg-background">
        <TabsTrigger value="playlist" className="flex-1">
          <ListIcon />
          재생목록
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1">
          <UsersIcon />
          멤버
        </TabsTrigger>
        <TabsTrigger value="chat" className="flex-1">
          <ChatIcon />
          채팅
        </TabsTrigger>
      </TabsList>
      <TabsContent value="playlist" className="p-4 text-sm text-muted-foreground">
        재생목록 콘텐츠
      </TabsContent>
      <TabsContent value="members" className="p-4 text-sm text-muted-foreground">
        멤버 콘텐츠
      </TabsContent>
      <TabsContent value="chat" className="p-4 text-sm text-muted-foreground">
        채팅 콘텐츠
      </TabsContent>
    </Tabs>
  ),
};
