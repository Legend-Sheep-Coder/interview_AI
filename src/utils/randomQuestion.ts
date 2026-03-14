import type { Question } from '../types';

export function randomQuestion(array: Question[]): Question | undefined {
  if (!array || array.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
