export type SoundName = 'win' | 'lose' | 'draw';

const cache = new Map<SoundName, HTMLAudioElement>();

function get(name: SoundName) {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    audio.preload = 'auto';
    cache.set(name, audio);
  }
  return audio;
}

export function preloadSounds() {
  (['win', 'lose', 'draw'] as const).forEach(get);
}

export function playSound(name: SoundName) {
  const audio = get(name);
  audio.currentTime = 0;
  audio.play().catch((err) => console.warn('Lecture du son impossible :', err));
}
