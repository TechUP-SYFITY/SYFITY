'use client';

import { ChevronDownIcon, CloseIcon, MusicIcon } from './SearchIcons';
import { SearchInput } from './SearchInput';
import { SearchResultList } from './SearchResultList';
import { SearchToast, type SearchToastMessage } from './SearchToast';
import type { SearchResultStatus, SearchVideo } from '../types/search';

interface SearchPanelProps {
  open: boolean;
  roomName: string;
  query: string;
  status: SearchResultStatus;
  results: SearchVideo[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onAdd: (video: SearchVideo) => void;
  errorMessage?: string;
  toast?: SearchToastMessage | null;
  onDismissToast?: () => void;
}

export function SearchPanel({
  open,
  roomName,
  query,
  status,
  results,
  onClose,
  onQueryChange,
  onAdd,
  errorMessage,
  toast = null,
  onDismissToast = () => undefined,
}: SearchPanelProps) {
  const overlayStateClass = open ? 'search-panel-overlay--open' : 'search-panel-overlay--closed';
  const dialogStateClass = open ? 'search-panel-dialog--open' : 'search-panel-dialog--closed';

  return (
    <div
      aria-hidden={!open}
      className={`search-panel-overlay fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-[#09090b] text-white md:items-start md:px-6 md:pt-[68px] ${overlayStateClass}`}
    >
      <div className="pointer-events-none absolute left-1/2 top-[-160px] h-[480px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(114,244,164,0.07)_0%,rgba(136,92,246,0.06)_55%,rgba(0,0,0,0)_75%)] blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-80px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[rgba(136,92,246,0.06)] blur-[110px]" />

      <div className="relative flex h-[calc(100dvh-67px)] w-full flex-col md:h-auto md:w-[448px] md:gap-6">
        <SyfityLogo />

        <section
          data-search-panel
          role="dialog"
          aria-modal={open}
          aria-labelledby="room-search-panel-title"
          className={`search-panel-dialog relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[24px] border-x border-t border-white/[0.09] bg-[rgba(14,14,16,0.98)] pt-px shadow-[0_-8px_60px_rgba(0,0,0,0.7)] md:h-[544px] md:min-h-[480px] md:flex-none md:rounded-2xl md:border md:bg-[rgba(17,17,19,0.8)] md:shadow-[0_40px_100px_rgba(0,0,0,0.65),0_0_80px_rgba(114,244,164,0.05)] ${dialogStateClass}`}
        >
          <div className="flex justify-center pb-4 pt-3 md:hidden">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          <header className="flex items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-2 md:px-4 md:pb-[14px] md:pt-4">
            <div className="flex min-w-0 items-center gap-3 md:gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#72f4a4]/20 bg-[#72f4a4]/10 md:h-8 md:w-8">
                <MusicIcon className="h-[17px] w-[17px] text-[#72f4a4] md:h-[15px] md:w-[15px]" />
              </div>
              <div className="min-w-0">
                <h2
                  id="room-search-panel-title"
                  className="truncate text-base font-bold leading-5 text-white md:text-sm md:leading-[18px]"
                >
                  곡 추가
                </h2>
                <p className="truncate text-xs leading-4 text-white/40">{roomName}</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="검색 패널 닫기"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-white/55 transition hover:bg-white/[0.12] hover:text-white md:h-7 md:w-7 md:bg-transparent"
            >
              <CloseIcon className="hidden h-4 w-4 md:block" />
              <ChevronDownIcon className="h-[18px] w-[18px] md:hidden" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <SearchInput
              className="border-b border-white/[0.07] px-4 pb-4 pt-4 md:pb-[12px]"
              query={query}
              onQueryChange={onQueryChange}
              isLoading={status === 'loading'}
            />
            <SearchResultList
              className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              status={status}
              results={results}
              query={query}
              errorMessage={errorMessage}
              onAdd={onAdd}
            />
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center px-4 md:bottom-[42px]">
        <SearchToast toast={toast} onDismiss={onDismissToast} />
      </div>
    </div>
  );
}

function SyfityLogo() {
  return (
    <div className="hidden items-center justify-center gap-2 md:flex">
      <div className="flex h-7 w-8 items-center justify-center">
        <span className="h-3 w-1 rounded-full bg-[#72f4a4] shadow-[0_0_12px_rgba(114,244,164,0.8)]" />
        <span className="mx-0.5 h-5 w-1 rounded-full bg-[#72f4a4]" />
        <span className="h-6 w-1 rounded-full bg-[#72f4a4]" />
        <span className="mx-0.5 h-5 w-1 rounded-full bg-[#72f4a4]" />
        <span className="h-3 w-1 rounded-full bg-[#72f4a4]" />
      </div>
      <span className="text-base font-bold leading-6 text-white">Syfity</span>
    </div>
  );
}
