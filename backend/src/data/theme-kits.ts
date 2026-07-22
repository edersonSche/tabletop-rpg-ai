import { NarrativeLanguage } from '../game/game.state';
import { getLocalizedItem } from './items.catalog';

export interface KitItemEntry {
  key: string;
  quantity: number;
}

export interface KitArchetype {
  id: string;
  recommendedStats: string[];
  defaultItems: KitItemEntry[];
  defaultNames: Record<NarrativeLanguage, string>;
  defaultDescriptions: Record<NarrativeLanguage, string>;
}

export interface ThemeKitOverride {
  archetype: string;
  names?: Record<NarrativeLanguage, string>;
  descriptions?: Record<NarrativeLanguage, string>;
  items?: KitItemEntry[];
}

export interface ResolvedKit {
  id: string;
  name: string;
  description: string;
  recommendedStats: string[];
  items: Array<{ name: string; quantity: number }>;
}

const ARCHETYPES: KitArchetype[] = [
  {
    id: 'warrior',
    recommendedStats: ['strength'],
    defaultItems: [
      { key: 'shortsword', quantity: 1 },
      { key: 'shield', quantity: 1 },
      { key: 'leather_armor', quantity: 1 },
      { key: 'healing_potion', quantity: 1 },
    ],
    defaultNames: {
      english: "Warrior's Kit",
      portuguese: 'Kit do Guerreiro',
      spanish: 'Kit del Guerrero',
    },
    defaultDescriptions: {
      english: 'Arm yourself for close combat with a blade, shield, and sturdy armor.',
      portuguese: 'Arme-se para o combate corpo a corpo com uma espada, escudo e armadura resistente.',
      spanish: 'Ármate para el combate cuerpo a cuerpo con una espada, escudo y armadura resistente.',
    },
  },
  {
    id: 'scout',
    recommendedStats: ['dexterity'],
    defaultItems: [
      { key: 'shortbow', quantity: 1 },
      { key: 'dagger', quantity: 1 },
      { key: 'leather_armor', quantity: 1 },
      { key: 'healing_potion', quantity: 1 },
      { key: 'rope', quantity: 1 },
    ],
    defaultNames: {
      english: "Scout's Kit",
      portuguese: 'Kit do Escoteiro',
      spanish: 'Kit del Explorador',
    },
    defaultDescriptions: {
      english: 'Move swiftly and strike from a distance with a bow, dagger, and tools for the wild.',
      portuguese: 'Mova-se com agilidade e ataque à distância com um arco, adaga e ferramentas para a natureza.',
      spanish: 'Muévete con agilidad y ataca a distancia con un arco, daga y herramientas para la naturaleza.',
    },
  },
  {
    id: 'scholar',
    recommendedStats: ['intelligence', 'wisdom', 'charisma'],
    defaultItems: [
      { key: 'quarterstaff', quantity: 1 },
      { key: 'arcane_grimoire', quantity: 1 },
      { key: 'healing_potion', quantity: 1 },
      { key: 'torch', quantity: 1 },
    ],
    defaultNames: {
      english: "Scholar's Kit",
      portuguese: 'Kit do Sábio',
      spanish: 'Kit del Sabio',
    },
    defaultDescriptions: {
      english: 'Harness knowledge and magic with a staff, arcane focus, and tools for research.',
      portuguese: 'Domine o conhecimento e a magia com um bordão, foco arcano e ferramentas de estudo.',
      spanish: 'Aprovecha el conocimiento y la magia con un bastón, enfoque arcano y herramientas de estudio.',
    },
  },
  {
    id: 'survivor',
    recommendedStats: ['constitution'],
    defaultItems: [
      { key: 'mace', quantity: 1 },
      { key: 'bandage', quantity: 2 },
      { key: 'antidote', quantity: 1 },
      { key: 'rope', quantity: 1 },
      { key: 'healing_potion', quantity: 2 },
    ],
    defaultNames: {
      english: "Survivor's Kit",
      portuguese: 'Kit do Sobrevivente',
      spanish: 'Kit del Superviviente',
    },
    defaultDescriptions: {
      english: 'Endure the harshest trials with robust gear, medical supplies, and survival tools.',
      portuguese: 'Suporte as provações mais difíceis com equipamento robusto, suprimentos médicos e ferramentas de sobrevivência.',
      spanish: 'Soporta las pruebas más duras con equipo robusto, suministros médicos y herramientas de supervivencia.',
    },
  },
];

const MEDIEVAL_OVERRIDES: ThemeKitOverride[] = [
  {
    archetype: 'warrior',
    names: {
      english: "Knight's Kit",
      portuguese: 'Kit do Cavaleiro',
      spanish: 'Kit del Caballero',
    },
    descriptions: {
      english: 'A trusty shortsword, a solid shield, and leather armor — ready to answer the call to adventure.',
      portuguese: 'Uma confiável espada curta, um escudo sólido e armadura de couro — pronto para atender ao chamado da aventura.',
      spanish: 'Una fiable espada corta, un escudo sólido y armadura de cuero — listo para responder al llamado de la aventura.',
    },
  },
  {
    archetype: 'scout',
    names: {
      english: "Ranger's Kit",
      portuguese: 'Kit do Guarda Florestal',
      spanish: 'Kit del Guardabosques',
    },
    descriptions: {
      english: 'A shortbow for distant foes, a dagger for close calls, and rope to traverse the wilderness.',
      portuguese: 'Um arco curto para inimigos distantes, uma adaga para emergências e corda para atravessar a natureza selvagem.',
      spanish: 'Un arco corto para enemigos distantes, una daga para emergencias y cuerda para atravesar la naturaleza salvaje.',
    },
  },
  {
    archetype: 'scholar',
    names: {
      english: "Mage's Kit",
      portuguese: 'Kit do Mago',
      spanish: 'Kit del Mago',
    },
    descriptions: {
      english: 'A quarterstaff for focus, an arcane grimoire full of mysteries, and a torch to light the dark.',
      portuguese: 'Um bordão para foco, um grimório arcano cheio de mistérios e uma tocha para iluminar a escuridão.',
      spanish: 'Un bastón para enfoque, un grimorio arcano lleno de misterios y una antorcha para iluminar la oscuridad.',
    },
  },
  {
    archetype: 'survivor',
    names: {
      english: "Adventurer's Kit",
      portuguese: 'Kit do Aventureiro',
      spanish: 'Kit del Aventurero',
    },
    descriptions: {
      english: 'A trusty mace, bandages, antidotes, rope, and extra potions — prepared for any danger.',
      portuguese: 'Uma maça confiável, ataduras, antídotos, corda e poções extras — preparado para qualquer perigo.',
      spanish: 'Una maza fiable, vendas, antídotos, cuerda y pociones extra — preparado para cualquier peligro.',
    },
  },
];

export function getKitItemEntries(kitId: string): KitItemEntry[] {
  const archetype = ARCHETYPES.find(a => a.id === kitId);
  if (!archetype) return [];

  const override = MEDIEVAL_OVERRIDES.find(o => o.archetype === kitId);
  return override?.items || archetype.defaultItems;
}

export function getKitsForTheme(language: NarrativeLanguage): ResolvedKit[] {
  return ARCHETYPES.map((archetype) => {
    const override = MEDIEVAL_OVERRIDES.find(o => o.archetype === archetype.id);

    const name = override?.names?.[language] || archetype.defaultNames[language] || archetype.defaultNames.english;
    const description = override?.descriptions?.[language] || archetype.defaultDescriptions[language] || archetype.defaultDescriptions.english;
    const itemEntries = override?.items || archetype.defaultItems;

    const items = itemEntries.map(entry => {
      const localized = getLocalizedItem(entry.key, language, entry.quantity);
      return {
        name: localized?.name || entry.key,
        quantity: entry.quantity,
      };
    });

    return {
      id: archetype.id,
      name,
      description,
      recommendedStats: archetype.recommendedStats,
      items,
    };
  });
}
