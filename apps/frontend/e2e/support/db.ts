// E2E DB 헬퍼. Prisma 대신 pg로 직결한다.
// backend의 Prisma client는 생성물(src/generated)이라 frontend 패키지에서 import하기 어렵고,
// 시드에 필요한 건 단순 INSERT·TRUNCATE뿐이라 드라이버 직결이 더 가볍다.
import { Pool } from 'pg';

import { DATABASE_URL, TEST_USERS, type TestUserKey } from './env';

let pool: Pool | undefined;

const getPool = () => {
  pool ??= new Pool({ connectionString: DATABASE_URL });
  return pool;
};

export const closePool = async () => {
  await pool?.end();
  pool = undefined;
};

// Room 생성 순서에 의존하지 않도록 CASCADE로 한 번에 비운다.
// users까지 비우는 건 globalSetup 뿐이고, spec 사이에는 resetRoomData를 쓴다.
const ALL_TABLES = [
  'chat_messages',
  'playlist_items',
  'personal_playlist_items',
  'personal_playlists',
  'recent_rooms',
  'room_members',
  'rooms',
  'users',
];

const ROOM_TABLES = ALL_TABLES.filter((table) => table !== 'users');

const truncate = async (tables: string[]) => {
  await getPool().query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
};

/** globalSetup 전용. 테스트 사용자까지 포함해 DB를 완전히 비운다. */
export const resetDatabase = () => truncate(ALL_TABLES);

/** spec 사이 격리용. 고정 테스트 사용자만 남기고 앱 데이터를 비운다. */
export const resetRoomData = () => truncate(ROOM_TABLES);

export const seedTestUsers = async () => {
  const users = Object.keys(TEST_USERS) as TestUserKey[];

  for (const key of users) {
    const { id, email, nickname } = TEST_USERS[key];
    await getPool().query(
      `INSERT INTO users (id, email, nickname, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, nickname = EXCLUDED.nickname`,
      [id, email, nickname],
    );
  }
};
