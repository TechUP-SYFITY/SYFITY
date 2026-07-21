import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatEmojiPicker } from './ChatEmojiPicker';

vi.mock('emoji-picker-react', () => ({
  default: ({
    categories,
    emojiVersion,
    height,
    onEmojiClick,
    previewConfig,
    skinTonesDisabled,
    theme,
    width,
  }: {
    categories?: Array<{ category: string; name: string }>;
    emojiVersion?: string;
    height?: number | string;
    onEmojiClick: (emojiData: { emoji: string }) => void;
    previewConfig?: { showPreview?: boolean };
    skinTonesDisabled?: boolean;
    theme?: string;
    width?: number | string;
  }) => (
    <button
      data-categories={categories?.map(({ category }) => category).join(',')}
      data-category-names={categories?.map(({ name }) => name).join(',')}
      data-emoji-version={emojiVersion}
      data-height={height}
      data-show-preview={previewConfig?.showPreview}
      data-skin-tones-disabled={skinTonesDisabled}
      data-theme={theme}
      data-width={width}
      type="button"
      onClick={() => onEmojiClick({ emoji: '😀' })}
    >
      피커 이모지 선택
    </button>
  ),
  Categories: {
    ACTIVITIES: 'activities',
    ANIMALS_NATURE: 'animals_nature',
    CUSTOM: 'custom',
    FLAGS: 'flags',
    FOOD_DRINK: 'food_drink',
    OBJECTS: 'objects',
    SMILEYS_PEOPLE: 'smileys_people',
    SUGGESTED: 'suggested',
    SYMBOLS: 'symbols',
    TRAVEL_PLACES: 'travel_places',
  },
  EmojiStyle: { NATIVE: 'native' },
  Theme: { DARK: 'dark' },
}));

describe('ChatEmojiPicker', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('선택한 Unicode 이모지를 상위 컴포넌트에 전달한다', async () => {
    const onEmojiSelect = vi.fn();
    render(<ChatEmojiPicker onEmojiSelect={onEmojiSelect} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    fireEvent.click(await screen.findByRole('button', { name: '피커 이모지 선택' }));

    expect(onEmojiSelect).toHaveBeenCalledWith('😀');
  });

  it('모바일 화면에서 body 포털로 안전 배치한다', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.tagName === 'FORM') {
        return {
          bottom: 711,
          height: 46,
          left: 67,
          right: 390,
          top: 665,
          width: 323,
          x: 67,
          y: 665,
          toJSON: () => ({}),
        };
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });

    render(
      <form>
        <ChatEmojiPicker onEmojiSelect={vi.fn()} />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker.parentElement).toHaveStyle({
      position: 'fixed',
      left: '59px',
      top: '357px',
      width: '323px',
      height: '300px',
    });
    expect(picker.parentElement?.parentElement).toBe(document.body);
    expect(picker).toHaveAttribute('data-width', '100%');
    expect(picker).toHaveAttribute('data-height', '100%');
  });

  it('Unicode 12.1 이하의 이모지만 표시한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-emoji-version', '12.1');
  });

  it('카테고리 제목 정보를 전달한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute(
      'data-category-names',
      expect.stringContaining('Smileys & People'),
    );
  });

  it('미리보기와 카테고리 탐색 영역을 숨긴다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-show-preview', 'false');
    expect(picker.parentElement).toHaveClass('chat-emoji-picker');
  });

  it('플래그 카테고리를 표시하지 않는다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).not.toHaveAttribute('data-categories', expect.stringContaining('flags'));
    expect(picker).toHaveAttribute('data-categories', expect.stringContaining('symbols'));
  });

  it('Syfity 다크 테마를 사용한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-theme', 'dark');
  });

  it('피부색 선택 기능을 비활성화한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-skin-tones-disabled', 'true');
  });
});
