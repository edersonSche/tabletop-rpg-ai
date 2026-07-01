import { useState } from 'react';
import type { NarrativeLanguage } from '../../types/game.types';

const LANGUAGES: { value: NarrativeLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'portuguese', label: 'Português (Brasil)' },
  { value: 'spanish', label: 'Español' },
];

const THEME_PRESETS: { label: string; setting: string }[] = [
  { label: 'Medieval Fantasy', setting: 'A classic medieval fantasy world of magic, ancient ruins, warring kingdoms, and mythical creatures.' },
  { label: 'Lovecraftian Horror', setting: 'A world of cosmic horror where ancient gods slumber beneath the earth, forbidden knowledge corrupts the mind, and sanity is a fragile candle in the dark.' },
  { label: 'Cyberpunk', setting: 'A dystopian future where mega-corporations rule, hackers blur the line between human and machine, and neon-lit streets hide dark secrets.' },
  { label: 'Dark Souls / Gothic Dark Fantasy', setting: 'A bleak, decaying world where hope is scarce, ancient curses twist the land, and every victory is earned through perseverance against impossible odds.' },
  { label: 'Pirate Adventure', setting: 'A golden age of sail where treasure maps, sea monsters, colonial intrigue, and lawless harbors await across vast uncharted oceans.' },
  { label: 'Steampunk', setting: 'A Victorian-era world of steam-powered technology, airships, clockwork automatons, and a society caught between tradition and innovation.' },
  { label: 'Sci-Fi / Space Opera', setting: 'An interstellar civilization where alien species, spacefaring guilds, and ancient cosmic secrets collide among the stars.' },
  { label: 'Weird West', setting: 'The frontier is lawless, the railroads are coming, and something strange lurks beyond the dusty town — cowboys, outlaws, and supernatural forces clash under the desert sun.' },
  { label: 'Post-Apocalyptic', setting: 'A world reduced to ashes by war or cataclysm, where survival is the only law, and pockets of civilization cling to life amidst radiation, mutants, and scarce resources.' },
  { label: 'Norse Mythology', setting: 'A world of frost giants, valkyries, and Yggdrasil — where honor is won in battle, the gods meddle in mortal affairs, and Ragnarök looms on the horizon.' },
  { label: 'Arabian Nights', setting: 'A desert realm of sultans, djinn, flying carpets, and ancient cities carved from sandstone — where magic is traded in marketplaces and sandstorms hide forgotten kingdoms.' },
  { label: 'Wuxia / Martial Arts', setting: 'An ancient land where martial artists transcend human limits, clans vie for supremacy, and honor, revenge, and forbidden techniques shape destiny.' },
  { label: 'Superhero / Modern Supers', setting: 'A modern world where superpowered beings emerge — some wearing capes, others hiding in shadows. Heroes, villains, and the thin line between them.' },
  { label: 'Arthurian Legend', setting: 'The age of Camelot — knights of the Round Table, the quest for the Holy Grail, courtly intrigue, and the enchanted isle of Avalon.' },
  { label: 'Zombie Survival', setting: 'The outbreak happened. Society collapsed. Now small groups of survivors navigate a world overrun by the undead, where other humans are often more dangerous than the horde.' },
  { label: 'Japanese Folklore', setting: 'A land of kami, yokai, and wandering samurai — where spirits lurk in bamboo groves, ancient shrines hold dark secrets, and the veil between worlds is thin.' },
  { label: 'Space Horror', setting: 'Deep space is silent, cold, and utterly indifferent. Aboard derelict ships and barren stations, something ancient and hungry waits — and it has noticed you.' },
  { label: 'Post-Magic Apocalypse', setting: 'Magic once reshaped the world — then it shattered. Now floating islands drift across a broken sky, reality bends in the wastelands, and mages are both feared and hunted.' },
  { label: 'Custom', setting: '' },
];

interface CreateRoomProps {
  onCreate: (name: string, language: NarrativeLanguage, campaignTheme?: string) => Promise<void>;
}

export function CreateRoom({ onCreate }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState<NarrativeLanguage>('english');
  const [selectedPreset, setSelectedPreset] = useState(THEME_PRESETS[0].label);
  const [customTheme, setCustomTheme] = useState('');

  const isCustom = selectedPreset === 'Custom';
  const [creating, setCreating] = useState(false);

  const handleThemeChange = (label: string) => {
    setSelectedPreset(label);
    if (label === 'Custom') {
      setCustomTheme('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || creating) return;
    setCreating(true);
    try {
      const preset = THEME_PRESETS.find(t => t.label === selectedPreset);
      const theme = isCustom ? customTheme.trim() : (preset?.setting || '');
      await onCreate(roomName.trim(), language, theme || undefined);
    } catch {
      setCreating(false);
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
        <div>
          <label className="text-mono text-sm text-dungeon-200 block mb-1">Theme</label>
          <select
            value={selectedPreset}
            onChange={e => handleThemeChange(e.target.value)}
            className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors cursor-pointer"
          >
            {THEME_PRESETS.map(t => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-mono text-sm text-dungeon-200 block mb-1">Theme Setting</label>
          <textarea
            value={isCustom ? customTheme : (THEME_PRESETS.find(t => t.label === selectedPreset)?.setting || '')}
            onChange={e => setCustomTheme(e.target.value)}
            disabled={!isCustom}
            className="w-full bg-dungeon-700 text-dungeon-100 p-3 text-mono text-lg pixel-border outline-none focus:border-gold transition-colors resize-none disabled:opacity-60"
            placeholder={isCustom ? "Describe your world..." : ""}
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={!roomName.trim() || creating || (isCustom && !customTheme.trim())}
          className="w-full bg-gold text-dungeon-900 font-bold py-3 px-4 text-mono text-lg pixel-border hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'CREATING...' : 'CREATE CAMPAIGN'}
        </button>
      </form>
    </div>
  );
}
