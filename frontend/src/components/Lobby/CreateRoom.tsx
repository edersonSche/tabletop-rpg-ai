import { useState } from 'react';
import type { NarrativeLanguage } from '../../types/game.types';

const LANGUAGES: { value: NarrativeLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'portuguese', label: 'Portuguese (Brazil)' },
  { value: 'spanish', label: 'Spanish' },
];

interface CreateRoomProps {
  onCreate: (name: string, language: NarrativeLanguage) => Promise<void>;
}

export function CreateRoom({ onCreate }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState<NarrativeLanguage>('english');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || creating) return;
    setCreating(true);
    try {
      await onCreate(roomName.trim(), language);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="card-stone p-5">
      <h2 className="font-pixel text-[10px] text-gold-400 mb-4 text-center text-shadow-glow-gold">NEW CAMPAIGN</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-pixel text-[7px] text-stone-400 block mb-2 tracking-wider">CAMPAIGN NAME</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="input-field"
            placeholder="Name your quest..."
          />
        </div>
        <div>
          <label className="font-pixel text-[7px] text-stone-400 block mb-2 tracking-wider">NARRATION LANGUAGE</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as NarrativeLanguage)}
            className="input-field cursor-pointer appearance-none"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={!roomName.trim() || creating} className="btn-gold w-full">
          {creating ? 'CONJURING...' : 'CREATE CAMPAIGN'}
        </button>
      </form>
    </div>
  );
}
