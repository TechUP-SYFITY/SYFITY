import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';

import { usePwaStore } from './pwaStore';
import { PwaUpdateNotice } from './PwaUpdateNotice';

const meta = {
  title: 'Widgets/PwaUpdateNotice',
  component: PwaUpdateNotice,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PwaUpdateNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

function UpdateStory() {
  useEffect(() => {
    usePwaStore.setState({ updateAvailable: true });
    return () => usePwaStore.setState({ updateAvailable: false });
  }, []);

  return <PwaUpdateNotice />;
}

export const UpdateAvailable: Story = {
  render: () => <UpdateStory />,
};
