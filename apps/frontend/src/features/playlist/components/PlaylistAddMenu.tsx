'use client';

// 곡 추가 컨트롤. Host는 "검색으로 추가 / 내 플레이리스트 불러오기" 드롭다운, 그 외엔 단일 버튼.
// 데스크톱 헤더와 모바일 플로팅 버튼에서 공통으로 쓴다.
import { ChevronDown, Download, Plus, Search } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

interface PlaylistAddMenuProps {
  disabled?: boolean;
  showImport?: boolean;
  onAddSearch: () => void;
  onImport?: () => void;
  variant?: 'header' | 'floating';
}

export function PlaylistAddMenu({
  disabled = false,
  showImport = false,
  onAddSearch,
  onImport,
  variant = 'header',
}: PlaylistAddMenuProps) {
  const isFloating = variant === 'floating';
  const buttonVariant = isFloating ? 'primary' : 'primary-soft';
  const buttonSize = isFloating ? 'md' : 'sm';
  const buttonClass = cn(
    'rounded-2xl',
    isFloating && 'h-11 justify-center px-4 py-0 text-center shadow-lg',
  );
  const iconClass = isFloating ? 'size-4' : 'size-3';
  const label = isFloating ? '곡 추가' : '추가';

  if (!showImport) {
    return (
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClass}
        type="button"
        disabled={disabled}
        onClick={onAddSearch}
      >
        <Plus className={iconClass} aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={buttonClass}
          type="button"
          disabled={disabled}
        >
          <Plus className={iconClass} aria-hidden />
          {label}
          <ChevronDown className={iconClass} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onAddSearch}>
          <Search aria-hidden />
          검색으로 추가
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onImport?.()}>
          <Download aria-hidden />내 플레이리스트 불러오기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
