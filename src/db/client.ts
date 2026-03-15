import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { dbUrl } from '../lib/config.js';

const client = postgres(dbUrl);
export const db = drizzle(client, { schema });
