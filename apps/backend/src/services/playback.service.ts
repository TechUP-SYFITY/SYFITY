import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import { getIo } from '../lib/io';
import type { PlaybackSessionStore } from '../lib/playback/playback-session.store';
import { createDefaultPlaybackSession } from '../lib/playback/playback-session.store';
import { buildShuffleQueue } from '../lib/playback/shuffle';
import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import type {
  PlaybackErrorResult,
  PlaybackPolicyPayload,
  PlaybackSession,
  PlaybackStatePayload,
  PlaybackTransitionResult,
} from '../types/playback';
import {
  toPlaylistItem,
  type IPlaylistRepository,
  type PlaylistItemRecord,
} from '../types/playlist';
import type { IRoomRepository } from '../types/room';
import type { PlaybackResetPayload } from '../types/socket';
import { assertActiveRoomMember, assertRoomHost } from '../utils/roomAccess';

const AUTO_ADVANCE_MARGIN_SECONDS = 1;
const PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS = 3;

type PlaybackRoomRepo = Pick<
  IRoomRepository,
  'findRoomById' | 'findMembership' | 'touchLastActivity'
>;
type PlaybackPlaylistRepo = Pick<
  IPlaylistRepository,
  'findItemById' | 'getPlaylist' | 'markUnavailable'
>;
type PlaybackYoutubeClient = Pick<IYouTubeClient, 'getVideoDetails'>;
type NextSelection = { itemId: string; remainingQueue: string[]; cycle: number } | null;

export type PlaybackPlayResult = PlaybackTransitionResult;

export class PlaybackService {
  private readonly playingRoomIds = new Set<string>();
  private readonly autoAdvanceTimers = new Map<string, NodeJS.Timeout>();
  private readonly roomLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly roomRepo: PlaybackRoomRepo,
    private readonly playlistRepo: PlaybackPlaylistRepo,
    private readonly sessionStore: PlaybackSessionStore,
    private readonly youtubeClient: PlaybackYoutubeClient,
  ) {}

  clearSession(roomId: string): void {
    this.clearAutoAdvanceTimer(roomId);
    this.sessionStore.clear(roomId);
    this.playingRoomIds.delete(roomId);
    this.roomLocks.delete(roomId);
  }

  resetSession(roomId: string): PlaybackResetPayload {
    this.clearAutoAdvanceTimer(roomId);
    this.playingRoomIds.delete(roomId);
    const session = createDefaultPlaybackSession();
    this.sessionStore.set(roomId, session);
    return {
      roomId,
      reason: 'cache-reset',
      playbackState: this.toStatePayload(session),
      playbackPolicy: this.toPolicyPayload(session),
    };
  }

  shutdown(): void {
    for (const timer of this.autoAdvanceTimers.values()) clearTimeout(timer);
    this.autoAdvanceTimers.clear();
    this.playingRoomIds.clear();
  }

  getPlayingRoomIds(): string[] {
    return Array.from(this.playingRoomIds);
  }

  async getStateForTick(roomId: string): Promise<PlaybackStatePayload> {
    return this.toStatePayload(this.sessionStore.get(roomId));
  }

  async getPlaybackStateForSocket(roomId: string, userId: string): Promise<PlaybackStatePayload> {
    return (await this.getSnapshotForSocket(roomId, userId)).playbackState;
  }

  async getSnapshotForSocket(
    roomId: string,
    userId: string,
  ): Promise<{ playbackState: PlaybackStatePayload; playbackPolicy: PlaybackPolicyPayload }> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);
    const session = this.sessionStore.get(roomId);
    return {
      playbackState: this.toStatePayload(session),
      playbackPolicy: this.toPolicyPayload(session),
    };
  }

  async play(roomId: string, userId: string, currentTime: number): Promise<PlaybackPlayResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      if (!session.playlistItemId) {
        const playlist = await this.playlistRepo.getPlaylist(roomId);
        const selection = this.selectInitial(session, playlist);
        if (!selection) {
          throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '재생할 곡이 없습니다.');
        }
        await this.roomRepo.touchLastActivity(roomId);
        return this.transitionToSelection(
          roomId,
          session,
          playlist,
          selection,
          [],
          'playback:change-track',
        );
      }
      await this.roomRepo.touchLastActivity(roomId);
      return this.applyTransition(
        roomId,
        session,
        { baseCurrentTime: currentTime, isPlaying: true },
        'playback:play',
      );
    });
  }

  async pause(roomId: string, userId: string, currentTime: number): Promise<PlaybackStatePayload> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    const result = await this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      await this.roomRepo.touchLastActivity(roomId);
      return this.applyTransition(
        roomId,
        session,
        { baseCurrentTime: currentTime, isPlaying: false },
        'playback:pause',
      );
    });
    return result.payload;
  }

  async seek(roomId: string, userId: string, seekTime: number): Promise<PlaybackStatePayload> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    const result = await this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      await this.roomRepo.touchLastActivity(roomId);
      return this.applyTransition(roomId, session, { baseCurrentTime: seekTime }, 'playback:seek');
    });
    return result.payload;
  }

  async selectTrack(
    roomId: string,
    userId: string,
    playlistItemId: string,
  ): Promise<PlaybackTransitionResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, async () => {
      const item = await this.playlistRepo.findItemById(playlistItemId);
      if (item?.roomId !== roomId || item.status !== 'available') {
        throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '항목을 찾을 수 없습니다.');
      }
      const session = this.sessionStore.get(roomId);
      const history = this.appendHistory(session, session.playlistItemId, playlistItemId);
      await this.roomRepo.touchLastActivity(roomId);
      return this.applyTransition(
        roomId,
        session,
        {
          videoId: item.videoId,
          playlistItemId: item.id,
          baseCurrentTime: 0,
          isPlaying: true,
          remainingPlaylistItemIds: session.remainingPlaylistItemIds.filter((id) => id !== item.id),
          playbackHistoryItemIds: history,
        },
        'playback:change-track',
      );
    });
  }

  async nextTrack(roomId: string, userId: string): Promise<PlaybackTransitionResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      const playlist = await this.playlistRepo.getPlaylist(roomId);
      const selection = this.selectNext(session, playlist, { honorRepeatOne: false });
      await this.roomRepo.touchLastActivity(roomId);
      if (!selection)
        return this.applyTransition(roomId, session, { isPlaying: false }, 'playback:pause');
      return this.transitionToSelection(
        roomId,
        session,
        playlist,
        selection,
        this.appendHistory(session, session.playlistItemId, selection.itemId),
        'playback:change-track',
      );
    });
  }

  async previousTrack(roomId: string, userId: string): Promise<PlaybackTransitionResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      const elapsed = this.computeCurrentTime(session);
      const playlist = await this.playlistRepo.getPlaylist(roomId);
      const available = new Map(
        playlist.filter((item) => item.status === 'available').map((item) => [item.id, item]),
      );
      const history = [...session.playbackHistoryItemIds];
      const previousId =
        elapsed < PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS ? history.pop() : undefined;
      const previous = previousId ? available.get(previousId) : undefined;
      await this.roomRepo.touchLastActivity(roomId);
      if (!previous) {
        return this.applyTransition(
          roomId,
          session,
          { baseCurrentTime: 0 },
          'playback:change-track',
        );
      }
      return this.applyTransition(
        roomId,
        session,
        {
          videoId: previous.videoId,
          playlistItemId: previous.id,
          baseCurrentTime: 0,
          isPlaying: true,
          playbackHistoryItemIds: history,
          remainingPlaylistItemIds: session.remainingPlaylistItemIds.filter(
            (id) => id !== previous.id,
          ),
        },
        'playback:change-track',
      );
    });
  }

  async updateSettings(
    roomId: string,
    userId: string,
    patch: Partial<PlaybackPolicyPayload>,
  ): Promise<PlaybackPolicyPayload & { playbackVersion: number }> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      const nextShuffleEnabled = patch.shuffleEnabled ?? session.shuffleEnabled;
      let queue = session.remainingPlaylistItemIds;
      let history = session.playbackHistoryItemIds;
      let cycle = session.shuffleCycle;
      if (patch.shuffleEnabled === true && !session.shuffleEnabled) {
        const playlist = await this.playlistRepo.getPlaylist(roomId);
        queue = buildShuffleQueue(
          playlist
            .filter((item) => item.status === 'available' && item.id !== session.playlistItemId)
            .map((item) => item.id),
        );
        cycle = 1;
      }
      if (patch.shuffleEnabled === false) {
        queue = [];
        history = [];
        cycle = 0;
      }
      const next: PlaybackSession = {
        ...session,
        repeatMode: patch.repeatMode ?? session.repeatMode,
        shuffleEnabled: nextShuffleEnabled,
        remainingPlaylistItemIds: queue,
        playbackHistoryItemIds: history,
        shuffleCycle: cycle,
        playbackVersion: session.playbackVersion + 1,
      };
      this.sessionStore.set(roomId, next);
      return { ...this.toPolicyPayload(next), playbackVersion: next.playbackVersion };
    });
  }

  async reportEnded(
    roomId: string,
    userId: string,
    playlistItemId: string,
    playbackVersion: number,
  ): Promise<PlaybackTransitionResult | null> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    return this.withRoomLock(roomId, () =>
      this.advanceIfCurrent(roomId, playlistItemId, playbackVersion),
    );
  }

  async reportError(
    roomId: string,
    userId: string,
    videoId: string,
    errorCode: number,
  ): Promise<PlaybackErrorResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    const errorPayload = { videoId, errorCode };
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      if (session.videoId !== videoId || !session.playlistItemId)
        return { errorPayload, playlist: null, transition: null };
      try {
        const [video] = await this.youtubeClient.getVideoDetails([videoId]);
        if (video) return { errorPayload, playlist: null, transition: null };
      } catch {
        return { errorPayload, playlist: null, transition: null };
      }
      await this.playlistRepo.markUnavailable(session.playlistItemId);
      const playlist = await this.playlistRepo.getPlaylist(roomId);
      const selection = this.selectNext(session, playlist, { honorRepeatOne: true });
      const transition = selection
        ? await this.transitionToSelection(
            roomId,
            session,
            playlist,
            selection,
            session.playbackHistoryItemIds,
            'playback:change-track',
          )
        : await this.applyTransition(roomId, session, { isPlaying: false }, 'playback:pause');
      return { errorPayload, playlist: playlist.map(toPlaylistItem), transition };
    });
  }

  async enqueueIfShuffled(roomId: string, itemId: string): Promise<void> {
    await this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      if (
        !session.shuffleEnabled ||
        session.playlistItemId === itemId ||
        session.remainingPlaylistItemIds.includes(itemId)
      )
        return;
      const index = Math.floor(Math.random() * (session.remainingPlaylistItemIds.length + 1));
      const queue = [...session.remainingPlaylistItemIds];
      queue.splice(index, 0, itemId);
      this.sessionStore.set(roomId, { ...session, remainingPlaylistItemIds: queue });
    });
  }

  async advanceAfterCurrentRemoved(
    roomId: string,
    itemId: string,
  ): Promise<PlaybackTransitionResult | null> {
    return this.withRoomLock(roomId, async () => {
      const session = this.sessionStore.get(roomId);
      if (session.playlistItemId !== itemId) {
        this.sessionStore.set(roomId, {
          ...session,
          remainingPlaylistItemIds: session.remainingPlaylistItemIds.filter((id) => id !== itemId),
          playbackHistoryItemIds: session.playbackHistoryItemIds.filter((id) => id !== itemId),
        });
        return null;
      }
      const playlist = (await this.playlistRepo.getPlaylist(roomId)).filter(
        (item) => item.id !== itemId,
      );
      const selection = this.selectNext(session, playlist, { honorRepeatOne: true });
      if (!selection)
        return this.applyTransition(roomId, session, { isPlaying: false }, 'playback:pause');
      return this.transitionToSelection(
        roomId,
        session,
        playlist,
        selection,
        session.playbackHistoryItemIds.filter((id) => id !== itemId),
        'playback:change-track',
      );
    });
  }

  private async advanceIfCurrent(
    roomId: string,
    playlistItemId: string,
    playbackVersion: number,
  ): Promise<PlaybackTransitionResult | null> {
    const session = this.sessionStore.get(roomId);
    if (session.playlistItemId !== playlistItemId || session.playbackVersion !== playbackVersion)
      return null;
    const playlist = await this.playlistRepo.getPlaylist(roomId);
    const selection = this.selectNext(session, playlist, { honorRepeatOne: true });
    if (!selection)
      return this.applyTransition(roomId, session, { isPlaying: false }, 'playback:pause');
    return this.transitionToSelection(
      roomId,
      session,
      playlist,
      selection,
      this.appendHistory(session, session.playlistItemId, selection.itemId),
      'playback:change-track',
    );
  }

  private async handleAutoAdvance(
    roomId: string,
    playlistItemId: string,
    playbackVersion: number,
  ): Promise<void> {
    const result = await this.withRoomLock(roomId, () =>
      this.advanceIfCurrent(roomId, playlistItemId, playbackVersion),
    );
    if (result) getIo().to(`room:${roomId}`).emit(result.broadcastEvent, result.payload);
  }

  private async applyTransition(
    roomId: string,
    session: PlaybackSession,
    patch: Partial<PlaybackSession>,
    broadcastEvent: PlaybackTransitionResult['broadcastEvent'],
  ): Promise<PlaybackTransitionResult> {
    const isPlaying = patch.isPlaying ?? session.isPlaying;
    const now = new Date().toISOString();
    const next: PlaybackSession = {
      ...session,
      ...patch,
      isPlaying,
      serverStartedAt: isPlaying ? now : null,
      serverPausedAt: isPlaying ? null : now,
      playbackVersion: session.playbackVersion + 1,
    };
    this.sessionStore.set(roomId, next);
    if (next.isPlaying && next.playlistItemId) {
      this.playingRoomIds.add(roomId);
      const duration = await this.getTrackDuration(roomId, next.playlistItemId);
      this.scheduleAutoAdvance(roomId, next, duration);
    } else {
      this.playingRoomIds.delete(roomId);
      this.clearAutoAdvanceTimer(roomId);
    }
    return { payload: this.toStatePayload(next), broadcastEvent };
  }

  private async transitionToSelection(
    roomId: string,
    session: PlaybackSession,
    playlist: PlaylistItemRecord[],
    selection: NextSelection,
    history: string[],
    broadcastEvent: PlaybackTransitionResult['broadcastEvent'],
  ): Promise<PlaybackTransitionResult> {
    if (!selection)
      return this.applyTransition(roomId, session, { isPlaying: false }, 'playback:pause');
    const item = playlist.find((candidate) => candidate.id === selection.itemId);
    if (!item)
      throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '재생할 곡이 없습니다.');
    return this.applyTransition(
      roomId,
      session,
      {
        videoId: item.videoId,
        playlistItemId: item.id,
        baseCurrentTime: 0,
        isPlaying: true,
        remainingPlaylistItemIds: selection.remainingQueue,
        shuffleCycle: selection.cycle,
        playbackHistoryItemIds: history,
      },
      broadcastEvent,
    );
  }

  private selectInitial(session: PlaybackSession, playlist: PlaylistItemRecord[]): NextSelection {
    const available = playlist.filter((item) => item.status === 'available');
    if (!available.length) return null;
    if (!session.shuffleEnabled)
      return { itemId: available[0]!.id, remainingQueue: [], cycle: session.shuffleCycle };
    const queue = session.remainingPlaylistItemIds.length
      ? session.remainingPlaylistItemIds
      : buildShuffleQueue(available.map((item) => item.id));
    const [itemId, ...remainingQueue] = queue;
    return itemId ? { itemId, remainingQueue, cycle: session.shuffleCycle || 1 } : null;
  }

  private selectNext(
    session: PlaybackSession,
    playlist: PlaylistItemRecord[],
    options: { honorRepeatOne: boolean },
  ): NextSelection {
    const available = playlist.filter((item) => item.status === 'available');
    if (!available.length) return null;
    if (options.honorRepeatOne && session.repeatMode === 'one' && session.playlistItemId) {
      return {
        itemId: session.playlistItemId,
        remainingQueue: session.remainingPlaylistItemIds,
        cycle: session.shuffleCycle,
      };
    }
    if (session.shuffleEnabled) {
      const validQueue = session.remainingPlaylistItemIds.filter((id) =>
        available.some((item) => item.id === id),
      );
      if (validQueue.length) {
        const [itemId, ...remainingQueue] = validQueue;
        return { itemId: itemId!, remainingQueue, cycle: session.shuffleCycle };
      }
      if (session.repeatMode === 'all' || !options.honorRepeatOne) {
        const [itemId, ...remainingQueue] = buildShuffleQueue(available.map((item) => item.id));
        return itemId ? { itemId, remainingQueue, cycle: session.shuffleCycle + 1 } : null;
      }
      return null;
    }
    const index = available.findIndex((item) => item.id === session.playlistItemId);
    const next = available[index + 1];
    if (next)
      return {
        itemId: next.id,
        remainingQueue: session.remainingPlaylistItemIds,
        cycle: session.shuffleCycle,
      };
    if (session.repeatMode === 'all' || !options.honorRepeatOne) {
      return {
        itemId: available[0]!.id,
        remainingQueue: session.remainingPlaylistItemIds,
        cycle: session.shuffleCycle,
      };
    }
    return null;
  }

  private appendHistory(
    session: PlaybackSession,
    currentId: string | null,
    nextId: string,
  ): string[] {
    return currentId && currentId !== nextId
      ? [...session.playbackHistoryItemIds, currentId]
      : session.playbackHistoryItemIds;
  }

  private async getTrackDuration(roomId: string, itemId: string): Promise<number> {
    const item = (await this.playlistRepo.getPlaylist(roomId)).find(
      (candidate) => candidate.id === itemId,
    );
    return item?.duration ?? 0;
  }

  private scheduleAutoAdvance(
    roomId: string,
    session: PlaybackSession,
    durationSeconds: number,
  ): void {
    this.clearAutoAdvanceTimer(roomId);
    if (!session.isPlaying || !session.playlistItemId) return;
    const remainingMs = Math.max(
      0,
      (durationSeconds + AUTO_ADVANCE_MARGIN_SECONDS - session.baseCurrentTime) * 1000,
    );
    const timer = setTimeout(() => {
      void this.handleAutoAdvance(roomId, session.playlistItemId!, session.playbackVersion);
    }, remainingMs);
    this.autoAdvanceTimers.set(roomId, timer);
  }

  private clearAutoAdvanceTimer(roomId: string): void {
    const timer = this.autoAdvanceTimers.get(roomId);
    if (timer) clearTimeout(timer);
    this.autoAdvanceTimers.delete(roomId);
  }

  private computeCurrentTime(session: PlaybackSession): number {
    return session.isPlaying && session.serverStartedAt
      ? session.baseCurrentTime + (Date.now() - new Date(session.serverStartedAt).getTime()) / 1000
      : session.baseCurrentTime;
  }

  private toStatePayload(session: PlaybackSession): PlaybackStatePayload {
    return {
      videoId: session.videoId,
      playlistItemId: session.playlistItemId,
      currentTime: this.computeCurrentTime(session),
      isPlaying: session.isPlaying,
      playbackVersion: session.playbackVersion,
    };
  }

  private toPolicyPayload(session: PlaybackSession): PlaybackPolicyPayload {
    return { repeatMode: session.repeatMode, shuffleEnabled: session.shuffleEnabled };
  }

  private async withRoomLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.roomLocks.get(roomId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.roomLocks.set(
      roomId,
      previous.then(() => gate),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
