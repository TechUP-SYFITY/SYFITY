// 전체 E2E 실행 전 1회: DB 초기화 → 테스트 사용자 시드 → storageState 생성.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createStorageState } from '../support/auth';
import { closePool, resetDatabase, seedTestUsers } from '../support/db';
import { storageStatePath, TEST_USERS, type TestUserKey } from '../support/env';

export default async function globalSetup() {
  try {
    await resetDatabase();
    await seedTestUsers();

    const users = Object.keys(TEST_USERS) as TestUserKey[];
    for (const user of users) {
      const path = storageStatePath(user);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(createStorageState(user), null, 2));
    }
  } finally {
    await closePool();
  }
}
