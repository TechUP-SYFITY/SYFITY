'use client';

import { useState } from 'react';

import { YoutubeSearchPanel } from './YoutubeSearchPanel';
import type { SearchVideo } from '../types/search';
import { formatDuration } from '../utils/formatDuration';

export function SearchDemoPage() {
  const [open, setOpen] = useState(true);
  const [selectedVideos, setSelectedVideos] = useState<SearchVideo[]>([]);

  return (
    <main className="min-h-dvh overflow-hidden bg-[#09090b] px-5 py-8 text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-180px] h-[480px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(114,244,164,0.07)_0%,rgba(136,92,246,0.06)_55%,rgba(0,0,0,0)_75%)] blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-100px] right-[-140px] h-[420px] w-[420px] rounded-full bg-[rgba(136,92,246,0.06)] blur-[110px]" />

      <div className="relative mx-auto flex max-w-3xl flex-col gap-6">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-semibold text-[#72f4a4]">Room Search Demo</p>
          <h1 className="mt-2 text-2xl font-bold">YouTube 곡 검색</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            PR #21 YouTube 검색 엔드포인트에 연결된 프론트엔드 확인 화면입니다.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 h-11 rounded-xl border border-[#72f4a4]/25 bg-[#72f4a4]/10 px-4 text-sm font-bold text-[#72f4a4] transition hover:bg-[#72f4a4]/15"
          >
            검색 패널 열기
          </button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <h2 className="text-base font-bold">추가한 곡</h2>
          {selectedVideos.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">아직 추가한 곡이 없어요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedVideos.map((video) => (
                <li
                  key={video.videoId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold">{video.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-white/45">
                    {formatDuration(video.duration)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <YoutubeSearchPanel
        open={open}
        roomName="Chill Night"
        onClose={() => setOpen(false)}
        onAdd={(video) => {
          setSelectedVideos((currentVideos) =>
            currentVideos.some((currentVideo) => currentVideo.videoId === video.videoId)
              ? currentVideos
              : [...currentVideos, video],
          );
        }}
      />
    </main>
  );
}
