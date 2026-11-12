import { CHOICES, counterOf, type Choice } from '@/entities/choice';

const randomChoice = (): Choice => CHOICES[Math.floor(Math.random() * CHOICES.length)].key;

/**
 * Picks the bot's move from the player's *previous* moves only (never the current one).
 * Mostly random, but sometimes counters the player's favourite recent move.
 */
export function pickBotChoice(history: readonly Choice[], aggressiveness = 0.35): Choice {
  const recent = history.slice(-6);
  if (recent.length < 2 || Math.random() >= aggressiveness) return randomChoice();

  const counts = new Map<Choice, number>();
  recent.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  const favourite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return counterOf(favourite);
}
