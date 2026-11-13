import { PerspectiveCamera, View } from '@react-three/drei';
import { resolveOutcome, type Choice } from '../../../model/choice';
import { StudioLights } from '../Studio';
import { BattleStage } from './BattleStage';
import { DRAW_DURATION, DrawClash } from './DrawClash';
import { PAPER_VS_ROCK_DURATION, PaperVsRock } from './PaperVsRock';
import { ROCK_VS_SCISSORS_DURATION, RockVsScissors } from './RockVsScissors';
import { SCISSORS_VS_PAPER_DURATION, ScissorsVsPaper } from './ScissorsVsPaper';

/** One duel per winning choice. Each is staged with the winner on the left. */
const DUELS: Record<Choice, { Duel: () => React.JSX.Element; duration: number }> = {
  pierre: { Duel: RockVsScissors, duration: ROCK_VS_SCISSORS_DURATION },
  ciseau: { Duel: ScissorsVsPaper, duration: SCISSORS_VS_PAPER_DURATION },
  papier: { Duel: PaperVsRock, duration: PAPER_VS_ROCK_DURATION },
};

export type BattleSceneProps = {
  /** Shown on the left. */
  mine: Choice;
  /** Shown on the right. */
  theirs: Choice;
  /** Called once when the fight has played out. */
  onDone?: () => void;
  /** Freezes the animation at a given time (previews and tests). */
  frozenAt?: number;
  className?: string;
};

/**
 * Animated fight between two choices.
 * Renders a plain element in the page; the 3D content is drawn at its place by the stage.
 */
export function BattleScene({ mine, theirs, onDone, frozenAt, className }: BattleSceneProps) {
  const outcome = resolveOutcome(mine, theirs);
  const duel = outcome === 'draw' ? null : DUELS[outcome === 'win' ? mine : theirs];

  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 2.5, 7.4]} fov={35} />
      <StudioLights />
      <BattleStage duration={duel?.duration ?? DRAW_DURATION} frozenAt={frozenAt} onDone={onDone}>
        {duel ? (
          // Duels are choreographed with the winner on the left: flip when the winner is on the right.
          <group scale={[outcome === 'win' ? 1 : -1, 1, 1]}>
            <duel.Duel />
          </group>
        ) : (
          <DrawClash kind={mine} />
        )}
      </BattleStage>
    </View>
  );
}
