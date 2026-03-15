import { createEmptyCard, fsrs, generatorParameters, type Grade, type Card } from 'ts-fsrs';
import type { CardState } from '../db/schema.js';

const f = fsrs(generatorParameters());

export interface FsrsCardData {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface FsrsResult {
  stability: number;
  difficulty: number;
  dueDate: Date;
  reps: number;
  lapses: number;
  state: CardState;
  interval: number;
}

/** DB 카드 데이터로 ts-fsrs Card 복원 */
function toFsrsCard(data: FsrsCardData): Card {
  const card = createEmptyCard();
  card.stability = data.stability;
  card.difficulty = data.difficulty;
  card.reps = data.reps;
  card.lapses = data.lapses;
  return card;
}

/** ts-fsrs state(number) → DB CardState 문자열 */
function mapState(state: number): CardState {
  switch (state) {
    case 0: return 'new';
    case 1: return 'learning';
    case 2: return 'review';
    case 3: return 'relearning';
    default: return 'new';
  }
}

/** FSRS 알고리즘으로 복습 스케줄링 계산 */
export function scheduleReview(cardData: FsrsCardData, grade: Grade): FsrsResult {
  const card = toFsrsCard(cardData);
  const now = new Date();
  const scheduling = f.repeat(card, now);
  const result = scheduling[grade];
  const updated = result.card;

  return {
    stability: updated.stability,
    difficulty: updated.difficulty,
    dueDate: updated.due,
    reps: updated.reps,
    lapses: updated.lapses,
    state: mapState(updated.state),
    interval: result.log.elapsed_days,
  };
}

/** 새 카드 기본값 */
export function getEmptyCardDefaults() {
  const card = createEmptyCard();
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
  };
}
