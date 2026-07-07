import { OAuth2Client } from 'google-auth-library';
import type { IocContainer } from 'tsoa';

import { cache } from './lib/cache';
import { getIo } from './lib/io';
import { prisma } from './lib/prisma';
import { YouTubeClient } from './lib/youtube/youtube.client';

import { AuthRepository } from './repositories/auth.repository';
import { ChatRepository } from './repositories/chat.repository';
import { PlaylistRepository } from './repositories/playlist.repository';
import { RoomRepository } from './repositories/room.repository';
import { UserRepository } from './repositories/user.repository';

import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { HealthService } from './services/health.service';
import { PlaylistService } from './services/playlist.service';
import { RoomService } from './services/room.service';
import { SearchService } from './services/search.service';
import { UserService } from './services/user.service';

import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { PlaylistController } from './controllers/playlist.controller';
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
const playlistRepository = new PlaylistRepository(prisma);
const chatRepository = new ChatRepository(prisma);
export const roomService = new RoomService(
  roomRepository,
  cache,
  playlistRepository,
  chatRepository,
);
let roomServiceWithIo: RoomService | null = null;
const playlistYoutubeClient = new YouTubeClient(config.youtube.apiKey);
let playlistService: PlaylistService | null = null;

function getRoomServiceWithIo(): RoomService {
  roomServiceWithIo ??= new RoomService(
    roomRepository,
    cache,
    playlistRepository,
    chatRepository,
    getIo(),
  );

  return roomServiceWithIo;
}

function getPlaylistService(): PlaylistService {
  playlistService ??= new PlaylistService(
    playlistRepository,
    roomRepository,
    playlistYoutubeClient,
    getIo(),
  );

  return playlistService;
}

register(UserController, () => new UserController(userService));
register(RoomController, () => new RoomController(userService, getRoomServiceWithIo()));
register(ChatController, () => new ChatController(new ChatService(chatRepository, roomRepository)));
register(SearchController, () => {
  const youtubeClient = new YouTubeClient(config.youtube.apiKey);
  return new SearchController(new SearchService(youtubeClient, cache));
});
register(PlaylistController, () => new PlaylistController(getPlaylistService()));

export const iocContainer: IocContainer = {
  get<T>(controller: new (...args: never[]) => T): T {
    const factory = registry.get(controller);
    if (!factory) throw new Error(`IoC: ${controller.name} not registered`);
    return factory() as T;
  },
};
