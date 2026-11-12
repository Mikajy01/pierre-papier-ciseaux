export type Choice = 'pierre' | 'papier' | 'ciseau';
export type Outcome = 'win' | 'lose' | 'draw';

export interface ChoiceOption {
  key: Choice;
  name: string;
  hint: string;
}

export const CHOICES: readonly ChoiceOption[] = [
  { key: 'pierre', name: 'Pierre', hint: 'Bat les ciseaux' },
  { key: 'papier', name: 'Papier', hint: 'Bat la pierre' },
  { key: 'ciseau', name: 'Ciseaux', hint: 'Bat le papier' },
];

/** Each choice mapped to the one it beats. */
export const BEATS: Record<Choice, Choice> = {
  pierre: 'ciseau',
  papier: 'pierre',
  ciseau: 'papier',
};

/** The choice that beats the given one. */
export const counterOf = (choice: Choice) =>
  (Object.keys(BEATS) as Choice[]).find((c) => BEATS[c] === choice)!;

export const isChoice = (value: unknown): value is Choice =>
  value === 'pierre' || value === 'papier' || value === 'ciseau';

export const choiceLabel = (choice: Choice | null) => CHOICES.find((o) => o.key === choice)?.name ?? '—';

export function resolveOutcome(mine: Choice, theirs: Choice): Outcome {
  if (mine === theirs) return 'draw';
  return BEATS[mine] === theirs ? 'win' : 'lose';
}
