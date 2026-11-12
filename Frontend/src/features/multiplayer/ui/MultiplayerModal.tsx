import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Hash, Loader2, Plus } from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import type { MultiplayerApi } from '../model/useMultiplayer';
import { ConnectionBadge } from './ConnectionBadge';
import { OtpInput } from './OtpInput';
import { WaitingRoom } from './WaitingRoom';

type View = 'menu' | 'join';

type Props = { mp: MultiplayerApi; open: boolean; onClose: () => void };

export function MultiplayerModal({ mp, open, onClose }: Props) {
  const [view, setView] = useState<View>('menu');
  const [code, setCode] = useState('');
  const online = mp.connection === 'connected';
  const waiting = mp.stage === 'waiting' && mp.session;

  const close = () => {
    if (mp.stage === 'waiting') mp.leave();
    setView('menu');
    setCode('');
    onClose();
  };

  const join = (otp = code) => {
    if (otp.length === 4 && mp.joinGame(otp)) setCode('');
  };

  const title = waiting ? 'Partie créée' : view === 'join' ? 'Rejoindre une partie' : 'Multijoueur';

  return (
    <Modal open={open} onClose={close} title={title} aside={<ConnectionBadge status={mp.connection} />}>
      {waiting ? (
        <WaitingRoom otp={mp.session!.otp} />
      ) : view === 'join' ? (
        <div className="text-center">
          <p className="text-zinc-400 text-sm">Saisissez le code à 4 chiffres partagé par votre ami.</p>
          <div className="mt-8">
            <OtpInput value={code} onChange={setCode} onComplete={join} disabled={!online} />
          </div>
          <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
            <Button variant="ghost" onClick={() => setView('menu')}>
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <Button onClick={() => join()} disabled={code.length !== 4 || !online}>
              Rejoindre
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-zinc-400 text-sm">Affrontez un ami en temps réel avec un code de partie privé.</p>
          <div className="mt-6 grid gap-3">
            <OptionCard
              icon={<Plus className="w-5 h-5" />}
              title="Créer une partie"
              description="Générez un code et partagez-le."
              disabled={!online}
              onClick={mp.createGame}
            />
            <OptionCard
              icon={<Hash className="w-5 h-5" />}
              title="Rejoindre une partie"
              description="Entrez le code reçu d'un ami."
              disabled={!online}
              onClick={() => setView('join')}
            />
          </div>
          {!online && (
            <p className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connexion au serveur… le premier démarrage peut prendre quelques secondes.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

type OptionCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
};

function OptionCard({ icon, title, description, disabled, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-4 w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
    >
      <span className="flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 group-hover:text-accent transition-colors">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-zinc-100">{title}</span>
        <span className="block text-sm text-zinc-500">{description}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
    </button>
  );
}
