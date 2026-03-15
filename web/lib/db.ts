import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Phase 1 스키마를 직접 정의 (경로 의존성 제거)
export {
  users, contents, vocabularies, quizzes,
  userQuizResults, reviewCards, dailyLogs,
  levelTestResults,
} from './schema';

import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, { max: 5 });
export const db = drizzle(client, { schema });
