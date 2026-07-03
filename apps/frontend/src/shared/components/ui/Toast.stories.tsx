import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { Button } from './Button';
import { Toast, ToastClose, ToastIcon, ToastProvider, ToastTitle, ToastViewport } from './Toast';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function Demo({
  variant,
  message,
  icon,
}: {
  variant: 'success' | 'error' | 'info';
  message: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider swipeDirection="down">
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(false);
          requestAnimationFrame(() => setOpen(true));
        }}
      >
        토스트 보기
      </Button>
      <Toast variant={variant} open={open} onOpenChange={setOpen} duration={4000}>
        <ToastIcon>{icon}</ToastIcon>
        <ToastTitle>{message}</ToastTitle>
        <ToastClose aria-label="닫기">
          <XIcon />
        </ToastClose>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

export const Success: Story = {
  render: () => (
    <Demo variant="success" message="플레이리스트에 추가했어요 🎵" icon={<CheckIcon />} />
  ),
};

export const Error: Story = {
  render: () => (
    <Demo
      variant="error"
      message="유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요."
      icon={<AlertIcon />}
    />
  ),
};

export const Info: Story = {
  render: () => <Demo variant="info" message="호스트가 재생을 시작했어요" icon={<AlertIcon />} />,
};
