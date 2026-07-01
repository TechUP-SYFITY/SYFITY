import { OAuth2Client } from 'google-auth-library';
import type { IocContainer } from 'tsoa';

import { prisma } from './lib/prisma';

import { AuthRepository } from './repositories/auth.repository';

import { AuthService } from './services/auth.service';
import { HealthService } from './services/health.service';

import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';

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

export const iocContainer: IocContainer = {
  get<T>(controller: new (...args: never[]) => T): T {
    const factory = registry.get(controller);
    if (!factory) throw new Error(`IoC: ${controller.name} not registered`);
    return factory() as T;
  },
};
