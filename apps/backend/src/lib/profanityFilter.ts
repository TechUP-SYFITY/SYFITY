import koreanWords from '@badwords/languages/ko';
import { ProfanityFilter } from 'badwords-wasm';

const profanityFilter = new ProfanityFilter(true, true, true, true);
profanityFilter.addWords(koreanWords);

export function maskProfanity(message: string): string {
  return profanityFilter.censor(message, '*');
}
