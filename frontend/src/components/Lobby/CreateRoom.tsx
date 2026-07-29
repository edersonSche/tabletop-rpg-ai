import { useState } from 'react';
import { ChevronDown } from 'pixelarticons/react';
import type { NarrativeLanguage } from '../../types/game.types';
import { Card, PanelTitle, Button, TextField } from '../../components/ui';

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
    <Card padding="md">
      <PanelTitle size="sm" center className="mb-4">NEW CAMPAIGN</PanelTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="CAMPAIGN NAME"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          placeholder="Name your quest..."
        />
        <div>
          <label className="font-pixel text-xs text-stone-400 block mb-2 tracking-wider">NARRATION LANGUAGE</label>
          <div className="relative">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as NarrativeLanguage)}
              className="input-field cursor-pointer appearance-none pr-6"
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <ChevronDown
              width={14}
              height={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400"
            />
          </div>
        </div>
        <Button type="submit" fullWidth disabled={!roomName.trim() || creating}>
          {creating ? 'CONJURING...' : 'CREATE CAMPAIGN'}
        </Button>
      </form>
    </Card>
  );
}
