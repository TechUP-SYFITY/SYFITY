import { authHandlers } from './auth.handlers';
import { playlistHandlers } from './playlist.handlers';
import { roomHandlers } from './room.handlers';
import { searchHandlers } from './search.handlers';

export const handlers = [...authHandlers, ...roomHandlers, ...playlistHandlers, ...searchHandlers];
