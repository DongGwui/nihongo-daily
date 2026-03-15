/**
 * 홈서버 DB에 직접 데이터를 시딩하는 스크립트
 *
 * 사용법:
 * 1. SSH 터널 열기: ssh -L 15432:localhost:5432 homeserver
 * 2. 스크립트 실행: DB_HOST=localhost DB_PORT=15432 DB_USER=postgres DB_PASSWORD=<pw> DB_NAME=nihongo npx tsx scripts/seed-remote.ts
 *
 * 또는 .env.remote 파일을 만들어서:
 *   DOTENV_CONFIG_PATH=.env.remote npx tsx scripts/seed-remote.ts
 */
import 'dotenv/config';
import { seedDatabase } from '../src/db/seed.js';

async function main() {
  console.log('Seeding remote database...');
  console.log(`DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

  await seedDatabase();

  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
