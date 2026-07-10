'use client';

import { isMockingEnabled } from '@/shared/lib/env';

import { fakeSocketClient } from './fakeSocketClient';
import { realSocketClient } from './realSocketClient';
import type { SocketClient } from './types';

export const socketClient: SocketClient = isMockingEnabled() ? fakeSocketClient : realSocketClient;
