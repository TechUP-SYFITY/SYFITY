// 생성/수정 겸용 폼의 모드 분기, 유효성, 제출 페이로드를 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { personalPlaylistApi } from '../api/personalPlaylistApi';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

vi.mock('../api/personalPlaylistApi', () => ({
  personalPlaylistApi: {
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
  },
}));

const existing: PersonalPlaylistSummary = {
  coverUrl: null,
  description: '밤에 듣기 좋은 곡',
  id: 'pl-1',
  itemCount: 4,
  name: '밤 드라이브',
  totalDuration: 800,
  updatedAt: '2026-07-20T12:00:00.000Z',
};

function renderDialog(props: Partial<React.ComponentProps<typeof CreatePlaylistDialog>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreatePlaylistDialog open onOpenChange={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

const nameInput = () => screen.getByLabelText(/이름/);
const submitButton = () => screen.getByRole('button', { name: /만들기|저장/ });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CreatePlaylistDialog - 생성 모드', () => {
  it('playlist가 없으면 생성 모드로 빈 폼을 보여준다', () => {
    renderDialog();

    expect(screen.getByText('새 플레이리스트')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('');
    expect(screen.getByRole('button', { name: '만들기' })).toBeInTheDocument();
  });

  it('이름이 비어 있으면 제출 버튼이 비활성이다', () => {
    renderDialog();

    expect(submitButton()).toBeDisabled();
  });

  it('공백만 입력해도 제출할 수 없다', () => {
    renderDialog();

    fireEvent.change(nameInput(), { target: { value: '   ' } });

    expect(submitButton()).toBeDisabled();
  });

  it('이름을 trim해서 createPlaylist를 호출한다', async () => {
    vi.mocked(personalPlaylistApi.createPlaylist).mockResolvedValue(existing);
    renderDialog();

    fireEvent.change(nameInput(), { target: { value: '  새 리스트  ' } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(personalPlaylistApi.createPlaylist).toHaveBeenCalledWith({
        name: '새 리스트',
        description: undefined,
      });
    });
  });

  it('설명을 입력하면 함께 전송한다', async () => {
    vi.mocked(personalPlaylistApi.createPlaylist).mockResolvedValue(existing);
    renderDialog();

    fireEvent.change(nameInput(), { target: { value: '새 리스트' } });
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '드라이브용' } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(personalPlaylistApi.createPlaylist).toHaveBeenCalledWith({
        name: '새 리스트',
        description: '드라이브용',
      });
    });
  });

  it('생성 성공 시 다이얼로그를 닫고 onCreated를 호출한다', async () => {
    vi.mocked(personalPlaylistApi.createPlaylist).mockResolvedValue(existing);
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();
    renderDialog({ onOpenChange, onCreated });

    fireEvent.change(nameInput(), { target: { value: '새 리스트' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onCreated).toHaveBeenCalledWith(existing);
  });

  it('생성 실패 시 에러 문구를 보여주고 닫지 않는다', async () => {
    vi.mocked(personalPlaylistApi.createPlaylist).mockRejectedValue(new Error('boom'));
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    fireEvent.change(nameInput(), { target: { value: '새 리스트' } });
    fireEvent.click(submitButton());

    expect(await screen.findByText('저장에 실패했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('CreatePlaylistDialog - 수정 모드', () => {
  it('playlist를 넘기면 기존 값으로 폼을 채운다', () => {
    renderDialog({ playlist: existing });

    expect(screen.getByText('플레이리스트 수정')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('밤 드라이브');
    expect(screen.getByLabelText('설명')).toHaveValue('밤에 듣기 좋은 곡');
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('createPlaylist가 아니라 updatePlaylist를 호출한다', async () => {
    vi.mocked(personalPlaylistApi.updatePlaylist).mockResolvedValue(existing);
    renderDialog({ playlist: existing });

    fireEvent.change(nameInput(), { target: { value: '새벽 드라이브' } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(personalPlaylistApi.updatePlaylist).toHaveBeenCalledWith('pl-1', {
        name: '새벽 드라이브',
        description: '밤에 듣기 좋은 곡',
      });
    });
    expect(personalPlaylistApi.createPlaylist).not.toHaveBeenCalled();
  });

  it('대상 playlist가 바뀌면 폼을 리마운트해 새 값으로 초기화한다', () => {
    const { rerender } = renderDialog({ playlist: existing });
    expect(nameInput()).toHaveValue('밤 드라이브');

    const other: PersonalPlaylistSummary = { ...existing, id: 'pl-2', name: '집중 로파이' };
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreatePlaylistDialog open onOpenChange={vi.fn()} playlist={other} />
      </QueryClientProvider>,
    );

    expect(nameInput()).toHaveValue('집중 로파이');
  });

  it('같은 playlist 객체가 새로 내려와도 입력 중이던 값을 덮어쓰지 않는다', () => {
    const { rerender } = renderDialog({ playlist: existing });

    fireEvent.change(nameInput(), { target: { value: '입력 중인 이름' } });

    // 백그라운드 refetch로 동일 id의 새 객체가 내려오는 상황
    const refetched: PersonalPlaylistSummary = { ...existing };
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreatePlaylistDialog open onOpenChange={vi.fn()} playlist={refetched} />
      </QueryClientProvider>,
    );

    expect(nameInput()).toHaveValue('입력 중인 이름');
  });
});
