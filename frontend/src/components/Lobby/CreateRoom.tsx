import { useState } from 'react';
import type { NarrativeLanguage } from '../../types/game.types';

const LANGUAGES: { value: NarrativeLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'portuguese', label: 'Português (Brasil)' },
  { value: 'spanish', label: 'Español' },
];

interface CreateRoomProps {
  onCreate: (name: string, language: NarrativeLanguage) => void;
}

export function CreateRoom({ onCreate }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState<NarrativeLanguage>('english');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreate(roomName.trim(), language);
    }
  };

  return (
    <div className="pixel-border bg-dungeon-500 p-6 rounded-none">
        <h2 className="text-pixel text-gold text-lg mb-4 text-center">NEW CAMPAIGN</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-mono text-sm text-dungeon-200 block mb-1">Campaign Name</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors"
            placeholder="e.g. The Dark Forest"
          />
        </div>
        <div>
          <label className="text-mono text-sm text-dungeon-200 block mb-1">Narration Language</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as NarrativeLanguage)}
            className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!roomName.trim()}
          className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CREATE CAMPAIGN
        </button>
      </form>
    </div>
  );
}
