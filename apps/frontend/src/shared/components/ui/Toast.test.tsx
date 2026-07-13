// 앱 전역 토스트 Provider의 push와 동일 ID 교체 동작을 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from './Button';
import { ToastProvider, useToast } from './Toast';

function ToastTrigger() {
  const { pushToast } = useToast();

  return (
    <>
      <Button onClick={() => pushToast({ title: '첫 번째 알림' })}>알림 표시</Button>
      <Button onClick={() => pushToast({ id: 'shared', title: '교체된 알림' })}>알림 교체</Button>
    </>
  );
}

describe('ToastProvider', () => {
  afterEach(cleanup);

  it('하위 feature가 push한 토스트를 전역 viewport에 표시한다', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '알림 표시' }));

    expect(screen.getByText('첫 번째 알림')).toBeInTheDocument();
  });

  it('같은 ID의 토스트를 중복하지 않고 최신 내용으로 교체한다', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '알림 교체' }));
    fireEvent.click(screen.getByRole('button', { name: '알림 교체' }));

    expect(screen.getAllByText('교체된 알림')).toHaveLength(1);
  });
});
