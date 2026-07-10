import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CHAT_MAX_MESSAGE_LENGTH } from '../chatConstants';
import { ChatInputForm } from './ChatInputForm';

describe('ChatInputForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('공백만 제출하면 onSubmit을 호출하지 않고 에러를 표시하지 않는다', () => {
    const onSubmit = vi.fn();
    render(<ChatInputForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText('채팅 메시지 입력');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('   ');
    expect(screen.queryByText(/초과할 수 없어요/)).toBeNull();
  });

  it('300자를 초과한 추가 입력은 300자로 유지하고 즉시 로컬 에러를 표시한다', () => {
    const onSubmit = vi.fn();
    render(<ChatInputForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText('채팅 메시지 입력');

    fireEvent.change(input, { target: { value: '가'.repeat(CHAT_MAX_MESSAGE_LENGTH + 1) } });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('가'.repeat(CHAT_MAX_MESSAGE_LENGTH));
    expect(
      screen.getByText(`메시지는 ${CHAT_MAX_MESSAGE_LENGTH}자를 초과할 수 없어요.`),
    ).toBeInTheDocument();
  });

  it('로컬 에러 이후 입력을 수정하면 에러를 지운다', () => {
    const onSubmit = vi.fn();
    render(<ChatInputForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText('채팅 메시지 입력');

    fireEvent.change(input, { target: { value: '가'.repeat(CHAT_MAX_MESSAGE_LENGTH + 1) } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    fireEvent.change(input, { target: { value: '다시 입력' } });

    expect(
      screen.queryByText(`메시지는 ${CHAT_MAX_MESSAGE_LENGTH}자를 초과할 수 없어요.`),
    ).toBeNull();
  });

  it('정상 제출 시 trim된 메시지를 넘기고 입력값을 초기화한다', () => {
    const onSubmit = vi.fn();
    render(<ChatInputForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText('채팅 메시지 입력');

    fireEvent.change(input, { target: { value: '  안녕하세요  ' } });
    fireEvent.click(screen.getByRole('button', { name: '메시지 보내기' }));

    expect(onSubmit).toHaveBeenCalledWith('안녕하세요');
    expect(input).toHaveValue('');
  });

  it('줄바꿈이 포함된 메시지를 입력할 수 있다', () => {
    const onSubmit = vi.fn();
    render(<ChatInputForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText('채팅 메시지 입력');

    fireEvent.change(input, { target: { value: '첫 줄\n둘째 줄' } });

    expect(input.tagName).toBe('TEXTAREA');
    expect(input).toHaveValue('첫 줄\n둘째 줄');
  });

  it('서버 전송 에러를 인라인으로 표시한다', () => {
    render(<ChatInputForm errorMessage="메시지 전송 실패" onSubmit={vi.fn()} />);

    expect(screen.getByText('메시지 전송 실패')).toBeInTheDocument();
  });
});
