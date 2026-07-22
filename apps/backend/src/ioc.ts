import { OAuth2Client } from 'google-auth-library';
import type { IocContainer } from 'tsoa';

import { cache } from './lib/cache';
import { PlaybackSessionStore } from './lib/playback/playback-session.store';
import { prisma } from './lib/prisma';
import { YouTubeClient } from './lib/youtube/youtube.client';

import { AuthRepository } from './repositories/auth.repository';
import { ChatRepository } from './repositories/chat.repository';
import { PersonalPlaylistRepository } from './repositories/personal-playlist.repository';
import { PlaylistRepository } from './repositories/playlist.repository';
import { RoomRepository } from './repositories/room.repository';
import { UserRepository } from './repositories/user.repository';

import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { HealthService } from './services/health.service';
import { PersonalPlaylistService } from './services/personal-playlist.service';
import { PlaybackService } from './services/playback.service';
import { PlaylistService } from './services/playlist.service';
import { PresenceService } from './services/presence.service';
import { RoomLifecycleService } from './services/room-lifecycle.service';
import { RoomService } from './services/room.service';
import { SearchService } from './services/search.service';
import { UserService } from './services/user.service';

import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { PersonalPlaylistController } from './controllers/personal-playlist.controller';
import { PlaylistImportController } from './controllers/playlist-import.controller';
import { PlaylistController } from './controllers/playlist.controller';
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

const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const roomRepository = new RoomRepository(prisma);
export const roomLifecycleService = new RoomLifecycleService(roomRepository);
const playlistRepository = new PlaylistRepository(prisma);
const personalPlaylistRepository = new PersonalPlaylistRepository(prisma);
const chatRepository = new ChatRepository(prisma);
const playbackSessionStore = new PlaybackSessionStore(cache);
const playlistYoutubeClient = new YouTubeClient(config.youtube.apiKey);
export const playbackService = new PlaybackService(
  roomRepository,
  playlistRepository,
  playbackSessionStore,
  playlistYoutubeClient,
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
export const playlistService = new PlaylistService(
  playlistRepository,
  roomRepository,
  playlistYoutubeClient,
  playbackService,
  personalPlaylistRepository,
);
export const personalPlaylistService = new PersonalPlaylistService(
  personalPlaylistRepository,
  playlistYoutubeClient,
);

register(UserController, () => new UserController(userService));
register(RoomController, () => new RoomController(userService, roomService));
export const roomLifecycleController = new RoomLifecycleController(roomLifecycleService);
register(RoomMembershipController, () => new RoomMembershipController(roomService));
register(RoomMemberController, () => new RoomMemberController(roomService));
register(ChatController, () => new ChatController(chatService));
register(SearchController, () => {
  const youtubeClient = new YouTubeClient(config.youtube.apiKey);
  return new SearchController(new SearchService(youtubeClient, cache));
});
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
