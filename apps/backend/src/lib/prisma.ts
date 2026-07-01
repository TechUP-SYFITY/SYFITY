import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { config } from '../config';
import { PrismaClient } from '../generated/prisma/client';

const pool = new pg.Pool({ connectionString: config.db.url });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
