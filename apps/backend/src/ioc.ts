import { OAuth2Client } from 'google-auth-library';
import type { IocContainer } from 'tsoa';

import { cache } from './lib/cache';
import { PlaybackSessionStore } from './lib/playback/playback-session.store';
import { prisma } from './lib/prisma';
import { SupabaseStorageClient } from './lib/storage/supabaseStorage.client';
import { createYouTubeClient } from './lib/youtube/youtube.factory';

import { AuthRepository } from './repositories/auth.repository';
import { ChatRepository } from './repositories/chat.repository';
import { PersonalPlaylistRepository } from './repositories/personal-playlist.repository';
import { PlaylistRepository } from './repositories/playlist.repository';
import { ProfileImageRepository } from './repositories/profile-image.repository';
import { RoomRepository } from './repositories/room.repository';
import { UserRepository } from './repositories/user.repository';

import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { HealthService } from './services/health.service';
import { MetadataRefreshService } from './services/metadata-refresh.service';
import { PersonalPlaylistService } from './services/personal-playlist.service';
import { PlaybackService } from './services/playback.service';
import { PlaylistService } from './services/playlist.service';
import { PresenceService } from './services/presence.service';
import { ProfileImageCleanupService } from './services/profile-image-cleanup.service';
import { RoomLifecycleService } from './services/room-lifecycle.service';
import { RoomService } from './services/room.service';
import { SearchService } from './services/search.service';
import { UserService } from './services/user.service';
import { YoutubeMetadataRefreshService } from './services/youtube-metadata-refresh.service';

import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { MetadataRefreshController } from './controllers/metadata-refresh.controller';
import { PersonalPlaylistController } from './controllers/personal-playlist.controller';
import { PlaylistImportController } from './controllers/playlist-import.controller';
import { PlaylistController } from './controllers/playlist.controller';
import { ProfileImageCleanupController } from './controllers/profile-image-cleanup.controller';
import { RoomLifecycleController } from './controllers/room-lifecycle.controller';
import { RoomMemberController } from './controllers/room-member.controller';
import { RoomMembershipController } from './controllers/room-membership.controller';
import { RoomController } from './controllers/room.controller';
import { SearchController } from './controllers/search.controller';
import { UserController } from './controllers/user.controller';

import { config } from './config';

const registry = new Map<Function, () => unknown>();

export function register<T>(cls: new (...args: never[]) => T, factory: () => T): void {
  registry.set(cls, factory as () => unknown);
}

register(HealthController, () => new HealthController(new HealthService()));
register(AuthController, () => {
  const oauthClient = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl,
  );
  const repo = new AuthRepository(prisma);
  return new AuthController(new AuthService(repo, oauthClient));
});

const roomRepository = new RoomRepository(prisma);
export const roomLifecycleService = new RoomLifecycleService(roomRepository);
const playlistRepository = new PlaylistRepository(prisma);
const personalPlaylistRepository = new PersonalPlaylistRepository(prisma);
const chatRepository = new ChatRepository(prisma);
const playbackSessionStore = new PlaybackSessionStore(cache);
// YouTube 클라이언트는 상태가 없으므로 앱 전역에서 하나만 만들어 공유한다.
// E2E 스텁 분기는 createYouTubeClient 안에서만 일어난다.
const youtubeClient = createYouTubeClient({
  apiKey: config.youtube.apiKey,
  nodeEnv: config.nodeEnv,
  e2eMode: config.e2eMode,
});
const youtubeMetadataRefreshService = new YoutubeMetadataRefreshService(youtubeClient);
export const playbackService = new PlaybackService(
  roomRepository,
  playlistRepository,
  playbackSessionStore,
  youtubeClient,
);
export const presenceService = new PresenceService(roomRepository, cache);
export const chatService = new ChatService(chatRepository, roomRepository);
export const roomService = new RoomService(
  roomRepository,
  cache,
  playlistRepository,
  chatRepository,
  playbackService,
  roomLifecycleService,
);
const profileImageStorage = new SupabaseStorageClient(
  config.supabase.profileImageBucket,
  config.supabase.url,
  config.supabase.secretKey,
);
const profileImageRepository = new ProfileImageRepository(prisma);
const userRepository = new UserRepository(prisma);
const userService = new UserService(
  userRepository,
  roomService,
  roomRepository,
  personalPlaylistRepository,
  profileImageStorage,
  config.supabase.profileImageBucket,
  profileImageRepository,
);
export const playlistService = new PlaylistService(
  playlistRepository,
  roomRepository,
  youtubeClient,
  playbackService,
  personalPlaylistRepository,
  youtubeMetadataRefreshService,
);
export const personalPlaylistService = new PersonalPlaylistService(
  personalPlaylistRepository,
  youtubeClient,
  youtubeMetadataRefreshService,
);
export const metadataRefreshService = new MetadataRefreshService(
  playlistService,
  personalPlaylistService,
);

register(UserController, () => new UserController(userService));
register(RoomController, () => new RoomController(userService, roomService));
export const roomLifecycleController = new RoomLifecycleController(roomLifecycleService);
export const metadataRefreshController = new MetadataRefreshController(metadataRefreshService);
export const profileImageCleanupController = new ProfileImageCleanupController(
  new ProfileImageCleanupService(profileImageRepository, profileImageStorage),
);
register(RoomMembershipController, () => new RoomMembershipController(roomService));
register(RoomMemberController, () => new RoomMemberController(roomService));
register(ChatController, () => new ChatController(chatService));
register(SearchController, () => new SearchController(new SearchService(youtubeClient, cache)));
register(PlaylistController, () => new PlaylistController(playlistService));
register(PersonalPlaylistController, () => new PersonalPlaylistController(personalPlaylistService));
register(PlaylistImportController, () => new PlaylistImportController(playlistService));

export const iocContainer: IocContainer = {
  get<T>(controller: new (...args: never[]) => T): T {
    const factory = registry.get(controller);
    if (!factory) throw new Error(`IoC: ${controller.name} not registered`);
    return factory() as T;
  },
};
