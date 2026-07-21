import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ComponentType, useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';

import { KickedMembersDialog } from './KickedMembersDialog';
import { KickMemberDialog } from './KickMemberDialog';
import { UnkickMemberDialog } from './UnkickMemberDialog';

type DialogState = 'kick' | 'kicked-list' | 'unkick';

interface MemberManagementDialogsStoryProps {
  state: DialogState;
}

function MemberManagementDialogsStory({ state }: MemberManagementDialogsStoryProps) {
  if (state === 'kick') {
    return (
      <KickMemberDialog
        member={roomFixture.members[1]}
        onOpenChange={fn()}
        open
        roomId={roomFixture.room.id}
      />
    );
  }

  if (state === 'unkick') {
    return (
      <UnkickMemberDialog
        member={roomFixture.kickedMembers[0]}
        onOpenChange={fn()}
        open
        roomId={roomFixture.room.id}
      />
    );
  }

  return (
    <KickedMembersDialog
      onOpenChange={fn()}
      onRequestUnkick={fn()}
      open
      roomId={roomFixture.room.id}
    />
  );
}

function DialogProviders(Story: ComponentType) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Story />
      </ToastProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Features/Presence/MemberManagementDialogs',
  component: MemberManagementDialogsStory,
  args: { state: 'kicked-list' },
  decorators: [DialogProviders],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof MemberManagementDialogsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KickedList: Story = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);

    await expect(screen.findByText('추방 멤버')).resolves.toBeInTheDocument();
    await expect(
      screen.findByRole('button', { name: '추방 멤버 추방 해제' }),
    ).resolves.toBeEnabled();
  },
};

export const KickConfirmation: Story = {
  args: { state: 'kick' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);

    await expect(screen.findByRole('button', { name: '추방하기' })).resolves.toBeEnabled();
  },
};

export const UnkickConfirmation: Story = {
  args: { state: 'unkick' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);

    await expect(screen.findByRole('button', { name: '해제하기' })).resolves.toBeEnabled();
  },
};
