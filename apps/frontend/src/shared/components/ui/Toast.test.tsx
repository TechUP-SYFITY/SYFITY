// 앱 전역 토스트 Provider의 push와 동일 ID 교체 동작을 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { ToastProvider, useToast } from './Toast';

function ToastTrigger() {
  const { pushToast } = useToast();

  return (
    <>
      <Button onClick={() => pushToast({ title: '첫 번째 알림' })}>알림 표시</Button>
      <Button onClick={() => pushToast({ id: 'shared', title: '교체된 알림' })}>알림 교체</Button>
      <Button onClick={() => pushToast({ id: 'shared-timer', title: '이전 알림', duration: 1000 })}>
        이전 알림 표시
      </Button>
      <Button onClick={() => pushToast({ id: 'shared-timer', title: '최신 알림', duration: 1000 })}>
        최신 알림 표시
      </Button>
      <Button onClick={() => pushToast({ id: 'first-timer', title: '짧은 알림', duration: 500 })}>
        짧은 알림 표시
      </Button>
      <Button onClick={() => pushToast({ id: 'second-timer', title: '긴 알림', duration: 1000 })}>
        긴 알림 표시
      </Button>
    </>
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

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

  it('같은 ID의 토스트를 교체하면 최신 토스트의 자동 종료 시간을 새로 시작한다', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '이전 알림 표시' }));
    await act(() => vi.advanceTimersByTimeAsync(600));
    fireEvent.click(screen.getByRole('button', { name: '최신 알림 표시' }));
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(screen.getByText('최신 알림')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(screen.queryByText('최신 알림')).not.toBeInTheDocument();
  });

  it('서로 다른 토스트를 연속 표시해도 각 duration 이후 모두 종료한다', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '짧은 알림 표시' }));
    fireEvent.click(screen.getByRole('button', { name: '긴 알림 표시' }));
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(screen.queryByText('짧은 알림')).not.toBeInTheDocument();
    expect(screen.getByText('긴 알림')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(screen.queryByText('긴 알림')).not.toBeInTheDocument();
  });
});
