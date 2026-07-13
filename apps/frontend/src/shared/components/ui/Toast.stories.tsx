import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Check, CircleAlert, Info as InfoIcon } from 'lucide-react';

import { Button } from './Button';
import { Toast, ToastProvider, useToast } from './Toast';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({
  variant,
  message,
  icon,
}: {
  variant: 'success' | 'error' | 'info';
  message: string;
  icon: React.ReactNode;
}) {
  const { pushToast } = useToast();

  return (
    <Button
      variant="ghost"
      onClick={() => {
        pushToast({ title: message, variant, icon, duration: 4000 });
      }}
    >
      토스트 보기
    </Button>
  );
}

function ToastStory({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

export const Success: Story = {
  render: () => (
    <ToastStory>
      <Demo variant="success" message="플레이리스트에 추가했어요 🎵" icon={<Check aria-hidden />} />
    </ToastStory>
  ),
};

export const Error: Story = {
  render: () => (
    <ToastStory>
      <Demo
        variant="error"
        message="유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요."
        icon={<CircleAlert aria-hidden />}
      />
    </ToastStory>
  ),
};

export const Info: Story = {
  render: () => (
    <ToastStory>
      <Demo variant="info" message="호스트가 재생을 시작했어요" icon={<InfoIcon aria-hidden />} />
    </ToastStory>
  ),
};
