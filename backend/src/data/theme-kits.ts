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

const THEME_OVERRIDES: Record<string, ThemeKitOverride[]> = {
  'Medieval Fantasy': [
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
  ],

  'Lovecraftian Horror': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Vigilant's Kit",
        portuguese: 'Kit do Vigia',
        spanish: 'Kit del Vigía',
      },
      descriptions: {
        english: 'Blade, shield, and torch — you face the dark with steel and courage, even when sanity falters.',
        portuguese: 'Espada, escudo e tocha — você enfrenta a escuridão com aço e coragem, mesmo quando a sanidade vacila.',
        spanish: 'Espada, escudo y antorcha — enfrentas la oscuridad con acero y coraje, incluso cuando la cordura flaquea.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'crossbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Investigator's Kit",
        portuguese: 'Kit do Investigador',
        spanish: 'Kit del Investigador',
      },
      descriptions: {
        english: 'A crossbow for what lurks in the shadows, a torch to reveal forbidden truths.',
        portuguese: 'Uma besta para o que espreita nas sombras, uma tocha para revelar verdades proibidas.',
        spanish: 'Una ballesta para lo que acecha en las sombras, una antorcha para revelar verdades prohibidas.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Occultist's Kit",
        portuguese: 'Kit do Ocultista',
        spanish: 'Kit del Ocultista',
      },
      descriptions: {
        english: 'Ancient tomes, a sturdy staff, and a keen mind — some secrets are better left unknown.',
        portuguese: 'Livros antigos, um bordão resistente e uma mente afiada — alguns segredos é melhor não conhecer.',
        spanish: 'Libros antiguos, un bastón resistente y una mente aguda — algunos secretos es mejor no conocerlos.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Survivalist's Kit",
        portuguese: 'Kit do Sobrevivencialista',
        spanish: 'Kit del Supervivencialista',
      },
      descriptions: {
        english: 'Crowbar, medical supplies, and a torch — when the old ones rise, you adapt or perish.',
        portuguese: 'Pé de cabra, suprimentos médicos e uma tocha — quando os anciões despertam, você se adapta ou perece.',
        spanish: 'Palanca, suministros médicos y una antorcha — cuando los antiguos despiertan, te adaptas o pereces.',
      },
    },
  ],

  Cyberpunk: [
    {
      archetype: 'warrior',
      items: [
        { key: 'combat_knife', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Solo's Kit",
        portuguese: 'Kit do Solo',
        spanish: 'Kit del Solo',
      },
      descriptions: {
        english: 'Tactical knife, pistol, and reinforced vest — a Solo lives by the trigger and dies by the blade.',
        portuguese: 'Faca tática, pistola e colete reforçado — um Solo vive pelo gatilho e morre pela lâmina.',
        spanish: 'Cuchillo táctico, pistola y chaleco reforzado — un Solo vive por el gatillo y muere por la cuchilla.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'pistol', quantity: 1 },
        { key: 'combat_knife', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Netrunner's Kit",
        portuguese: 'Kit do Netrunner',
        spanish: 'Kit del Netrunner',
      },
      descriptions: {
        english: 'Pistol for the streets, cyberdeck for the net — infiltrate any system, physical or digital.',
        portuguese: 'Pistola para as ruas, ciberdeck para a rede — infiltre-se em qualquer sistema, físico ou digital.',
        spanish: 'Pistola para las calles, ciberdeck para la red — infíltrate en cualquier sistema, físico o digital.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'cyberdeck', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Techie's Kit",
        portuguese: 'Kit do Tecnoespecialista',
        spanish: 'Kit del Técnico',
      },
      descriptions: {
        english: 'Cyberdeck, tools, and a sidearm — code, hack, and build your way through the urban sprawl.',
        portuguese: 'Ciberdeck, ferramentas e uma arma lateral — code, hackeie e construa seu caminho pela metrópole.',
        spanish: 'Ciberdeck, herramientas y un arma lateral — codifica, hackea y construye tu camino a través del sprawl urbano.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'shock_baton', quantity: 1 },
        { key: 'medkit', quantity: 2 },
        { key: 'bandage', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'pistol', quantity: 1 },
      ],
      names: {
        english: "Rigger's Kit",
        portuguese: 'Kit do Rigger',
        spanish: 'Kit del Rigger',
      },
      descriptions: {
        english: 'Shock baton, medkits, and lockpicks — in the gutter, the prepared survive the longest.',
        portuguese: 'Bastão elétrico, kits médicos e gazuas — na sarjeta, os preparados sobrevivem mais tempo.',
        spanish: 'Bastón eléctrico, botiquines y ganzúas — en la cloaca, los preparados sobreviven más tiempo.',
      },
    },
  ],

  'Dark Souls / Gothic Dark Fantasy': [
    {
      archetype: 'warrior',
      items: [
        { key: 'battleaxe', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'chain_shirt', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Knight's Kit",
        portuguese: 'Kit do Cavaleiro',
        spanish: 'Kit del Caballero',
      },
      descriptions: {
        english: 'Battleaxe, shield, and chain — steel yourself against the coming darkness.',
        portuguese: 'Machado de batalha, escudo e cota de malha — prepare-se contra a escuridão vindoura.',
        spanish: 'Hacha de batalla, escudo y cota de malla — prepárate contra la oscuridad venidera.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'crossbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Mercenary's Kit",
        portuguese: 'Kit do Mercenário',
        spanish: 'Kit del Mercenario',
      },
      descriptions: {
        english: 'A crossbow for distance, a dagger for when they get close — light and deadly.',
        portuguese: 'Uma besta para distância, uma adaga para quando se aproximam — leve e mortal.',
        spanish: 'Una ballesta para la distancia, una daga para cuando se acercan — ligera y mortal.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Pyromancer's Kit",
        portuguese: 'Kit do Piromante',
        spanish: 'Kit del Piromante',
      },
      descriptions: {
        english: 'Staff, grimoire, and flame — peer into the abyss, but do not blink.',
        portuguese: 'Bordão, grimório e chama — olhe para o abismo, mas não pisque.',
        spanish: 'Bastón, grimorio y llama — mira al abismo, pero no parpadees.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'mace', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Deprived's Kit",
        portuguese: 'Kit do Desprovido',
        spanish: 'Kit del Desposeído',
      },
      descriptions: {
        english: 'A mace, bandages, and sheer will — when you have nothing, you fight for everything.',
        portuguese: 'Uma maça, ataduras e pura vontade — quando não tem nada, você luta por tudo.',
        spanish: 'Una maza, vendas y pura voluntad — cuando no tienes nada, luchas por todo.',
      },
    },
  ],

  'Pirate Adventure': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Buccaneer's Kit",
        portuguese: 'Kit do Bucaneiro',
        spanish: 'Kit del Bucanero',
      },
      descriptions: {
        english: 'Cutlass, shield, and tough hide — boarding actions await your blade.',
        portuguese: 'Cutelo, escudo e couro resistente — ações de abordagem aguardam sua lâmina.',
        spanish: 'Alfanje, escudo y cuero resistente — las acciones de abordaje esperan tu hoja.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'flintlock', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'spyglass', quantity: 1 },
        { key: 'rope', quantity: 1 },
      ],
      names: {
        english: "Navigator's Kit",
        portuguese: 'Kit do Navegador',
        spanish: 'Kit del Navegante',
      },
      descriptions: {
        english: 'A flintlock, spyglass, and rope — chart the unknown and claim the horizon.',
        portuguese: 'Uma pistola de pederneira, luneta e corda — mapeie o desconhecido e conquiste o horizonte.',
        spanish: 'Una pistola de chispa, catalejo y cuerda — traza lo desconocido y conquista el horizonte.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'rapier', quantity: 1 },
        { key: 'map_case', quantity: 1 },
        { key: 'spyglass', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Smuggler's Kit",
        portuguese: 'Kit do Contrabandista',
        spanish: 'Kit del Contrabandista',
      },
      descriptions: {
        english: 'Rapier, maps, and contraband — a silver tongue opens every port.',
        portuguese: 'Rapieira, mapas e contrabando — uma língua afiada abre todos os portos.',
        spanish: 'Estoque, mapas y contrabando — una lengua afilada abre todos los puertos.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Quartermaster's Kit",
        portuguese: 'Kit do Intendente',
        spanish: 'Kit del Intendente',
      },
      descriptions: {
        english: 'Crowbar, supplies, and medical kit — the crew stays afloat because of you.',
        portuguese: 'Pé de cabra, suprimentos e kit médico — a tripulação se mantém à tona por sua causa.',
        spanish: 'Palanca, suministros y botiquín — la tripulación se mantiene a flote gracias a ti.',
      },
    },
  ],

  Steampunk: [
    {
      archetype: 'warrior',
      items: [
        { key: 'rapier', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Gentleman's Kit",
        portuguese: 'Kit do Cavalheiro',
        spanish: 'Kit del Caballero',
      },
      descriptions: {
        english: 'Rapier, pistol, and fine leather — duel with honor in the gaslit streets.',
        portuguese: 'Rapieira, pistola e couro fino — duelo com honra nas ruas iluminadas a gás.',
        spanish: 'Estoque, pistola y cuero fino — duela con honor en las calles iluminadas por gas.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'flintlock', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'oil_flask', quantity: 1 },
      ],
      names: {
        english: "Rogue's Kit",
        portuguese: 'Kit do Ladino',
        spanish: 'Kit del Pícaro',
      },
      descriptions: {
        english: 'Flintlock, lockpicks, and oil — shadows and steam hide your every move.',
        portuguese: 'Pederneira, gazuas e óleo — sombras e vapor escondem cada movimento seu.',
        spanish: 'Chispa, ganzúas y aceite — sombras y vapor esconden cada movimiento tuyo.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'oil_flask', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Engineer's Kit",
        portuguese: 'Kit do Engenheiro',
        spanish: 'Kit del Ingeniero',
      },
      descriptions: {
        english: 'Staff, blueprints, and tools — invention is the truest form of magic.',
        portuguese: 'Bordão, grimório técnico e ferramentas — a invenção é a forma mais pura de magia.',
        spanish: 'Bastón, grimorio técnico y herramientas — la invención es la forma más pura de magia.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'mace', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'oil_flask', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Aeronaut's Kit",
        portuguese: 'Kit do Aeronauta',
        spanish: 'Kit del Aeronauta',
      },
      descriptions: {
        english: 'Mace, medical supplies, and oil — when the airship goes down, you survive.',
        portuguese: 'Maça, suprimentos médicos e óleo — quando o dirigível cai, você sobrevive.',
        spanish: 'Maza, suministros médicos y aceite — cuando la aeronave cae, tú sobrevives.',
      },
    },
  ],

  'Sci-Fi / Space Opera': [
    {
      archetype: 'warrior',
      items: [
        { key: 'combat_knife', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Soldier's Kit",
        portuguese: 'Kit do Soldado',
        spanish: 'Kit del Soldado',
      },
      descriptions: {
        english: 'Sidearm, combat knife, and armor — standard issue for the frontier.',
        portuguese: 'Arma lateral, faca tática e armadura — equipamento padrão para a fronteira.',
        spanish: 'Arma lateral, cuchillo táctico y armadura — equipo estándar para la frontera.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'pistol', quantity: 1 },
        { key: 'combat_knife', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Operative's Kit",
        portuguese: 'Kit do Operativo',
        spanish: 'Kit del Operativo',
      },
      descriptions: {
        english: 'Light arms, infiltration tools — slip through the cracks of the galactic empire.',
        portuguese: 'Armas leves, ferramentas de infiltração — deslize pelas frestas do império galático.',
        spanish: 'Armas ligeras, herramientas de infiltración — deslízate por las grietas del imperio galáctico.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'cyberdeck', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Scientist's Kit",
        portuguese: 'Kit do Cientista',
        spanish: 'Kit del Científico',
      },
      descriptions: {
        english: 'Data deck, scanner, and sidearm — explore the unknown, document everything.',
        portuguese: 'Ciberdeck, scanner e arma lateral — explore o desconhecido, documente tudo.',
        spanish: 'Ciberdeck, escáner y arma lateral — explora lo desconocido, documenta todo.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'medkit', quantity: 2 },
        { key: 'bandage', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'pistol', quantity: 1 },
      ],
      names: {
        english: "Scavenger's Kit",
        portuguese: 'Kit do Saqueador',
        spanish: 'Kit del Saqueador',
      },
      descriptions: {
        english: 'Crowbar, medkits, and a pistol — salvage what you can from the ruins of civilization.',
        portuguese: 'Pé de cabra, kits médicos e uma pistola — recupere o que puder das ruínas da civilização.',
        spanish: 'Palanca, botiquines y una pistola — recupera lo que puedas de las ruinas de la civilización.',
      },
    },
  ],

  'Weird West': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'revolver', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Gunslinger's Kit",
        portuguese: 'Kit do Pistoleiro',
        spanish: 'Kit del Pistolero',
      },
      descriptions: {
        english: 'Revolver, blade, and duster — justice is delivered hot and fast on this frontier.',
        portuguese: 'Revólver, lâmina e sobretudo — a justiça é dada quente e rápida nesta fronteira.',
        spanish: 'Revólver, cuchilla y gabardina — la justicia se sirve caliente y rápida en esta frontera.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'revolver', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Outlaw's Kit",
        portuguese: 'Kit do Foragido',
        spanish: 'Kit del Forajido',
      },
      descriptions: {
        english: 'Six-shooter, lockpicks, and rope — ride fast, live free, and never get caught.',
        portuguese: 'Revólver, gazuas e corda — cavalgue rápido, viva livre e nunca seja pego.',
        spanish: 'Revólver, ganzúas y cuerda — cabalga rápido, vive libre y nunca seas atrapado.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Mystic's Kit",
        portuguese: 'Kit do Místico',
        spanish: 'Kit del Místico',
      },
      descriptions: {
        english: 'Tomes, staff, and sundry herbs — ancient magic still lingers in the desert winds.',
        portuguese: 'Tomos, bordão e ervas diversas — a magia antiga ainda persiste nos ventos do deserto.',
        spanish: 'Tomos, bastón y hierbas diversas — la magia antigua aún persiste en los vientos del desierto.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Prospector's Kit",
        portuguese: 'Kit do Garimpeiro',
        spanish: 'Kit del Buscador',
      },
      descriptions: {
        english: 'Pick, bandages, and supplies — the wilderness rewards the resilient.',
        portuguese: 'Picareta, ataduras e suprimentos — o deserto recompensa os resilientes.',
        spanish: 'Pico, vendas y suministros — el desierto recompensa a los resilientes.',
      },
    },
  ],

  'Post-Apocalyptic': [
    {
      archetype: 'warrior',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'bandage', quantity: 1 },
      ],
      names: {
        english: "Raider's Kit",
        portuguese: 'Kit do Saqueador',
        spanish: 'Kit del Asaltante',
      },
      descriptions: {
        english: 'Crowbar, pistol, and armor — take what you need, leave nothing behind.',
        portuguese: 'Pé de cabra, pistola e armadura — pegue o que precisa, não deixe nada para trás.',
        spanish: 'Palanca, pistola y armadura — toma lo que necesitas, no dejes nada atrás.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'crossbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'bandage', quantity: 1 },
      ],
      names: {
        english: "Scavenger's Kit",
        portuguese: 'Kit do Catador',
        spanish: 'Kit del Recolector',
      },
      descriptions: {
        english: 'Crossbow, lockpicks, and stealth — the wastes belong to those who move unseen.',
        portuguese: 'Besta, gazuas e furtividade — os ermos pertencem a quem se move sem ser visto.',
        spanish: 'Ballesta, ganzúas y sigilo — los páramos pertenecen a quienes se mueven sin ser vistos.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'medkit', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'bandage', quantity: 1 },
      ],
      names: {
        english: "Doctor's Kit",
        portuguese: 'Kit do Médico',
        spanish: 'Kit del Doctor',
      },
      descriptions: {
        english: 'Knowledge is scarce, medicine is power — keep the wasteland alive, one patient at a time.',
        portuguese: 'Conhecimento é escasso, medicina é poder — mantenha o ermo vivo, um paciente de cada vez.',
        spanish: 'El conocimiento es escaso, la medicina es poder — mantén el páramo vivo, un paciente a la vez.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'medkit', quantity: 2 },
      ],
      names: {
        english: "Survivor's Kit",
        portuguese: 'Kit do Sobrevivente',
        spanish: 'Kit del Superviviente',
      },
      descriptions: {
        english: 'Everything you need to outlast the apocalypse — tools, meds, and raw determination.',
        portuguese: 'Tudo que você precisa para sobreviver ao apocalipse — ferramentas, remédios e pura determinação.',
        spanish: 'Todo lo que necesitas para sobrevivir al apocalipsis — herramientas, medicinas y pura determinación.',
      },
    },
  ],

  'Norse Mythology': [
    {
      archetype: 'warrior',
      items: [
        { key: 'battleaxe', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'chain_shirt', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Berserker's Kit",
        portuguese: 'Kit do Berserker',
        spanish: 'Kit del Berserker',
      },
      descriptions: {
        english: 'Battleaxe, shield, and chain — Valhalla awaits those who fight with fury.',
        portuguese: 'Machado de batalha, escudo e cota de malha — Valhalla aguarda aqueles que lutam com fúria.',
        spanish: 'Hacha de batalla, escudo y cota de malla — Valhalla espera a quienes luchan con furia.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'shortbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Hunter's Kit",
        portuguese: 'Kit do Caçador',
        spanish: 'Kit del Cazador',
      },
      descriptions: {
        english: 'Bow, dagger, and torch — through frozen fjords and deep forests, you stalk your prey.',
        portuguese: 'Arco, adaga e tocha — através de fiordes congelados e florestas profundas, você persegue sua presa.',
        spanish: 'Arco, daga y antorcha — a través de fiordos congelados y bosques profundos, acechas a tu presa.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Seer's Kit",
        portuguese: 'Kit do Vidente',
        spanish: 'Kit del Vidente',
      },
      descriptions: {
        english: 'Staff, runes, and the wisdom of Odin — the threads of fate are yours to read.',
        portuguese: 'Bordão, runas e a sabedoria de Odin — os fios do destino são seus para ler.',
        spanish: 'Bastón, runas y la sabiduría de Odín — los hilos del destino son tuyos para leer.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'battleaxe', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Raider's Kit",
        portuguese: 'Kit do Saqueador',
        spanish: 'Kit del Saqueador',
      },
      descriptions: {
        english: 'Axe, supplies, and raw endurance — the frozen north breeds the toughest souls.',
        portuguese: 'Machado, suprimentos e resistência bruta — o norte congelado cria as almas mais duras.',
        spanish: 'Hacha, suministros y resistencia bruta — el norte congelado cría las almas más duras.',
      },
    },
  ],

  'Arabian Nights': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Desert Knight's Kit",
        portuguese: 'Kit do Cavaleiro do Deserto',
        spanish: 'Kit del Caballero del Desierto',
      },
      descriptions: {
        english: 'Scimitar, shield, and light armor — ride the dunes with honor and steel.',
        portuguese: 'Cimitarra, escudo e armadura leve — cavalgue as dunas com honra e aço.',
        spanish: 'Cimitarra, escudo y armadura ligera — cabalga las dunas con honor y acero.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'shortbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'spyglass', quantity: 1 },
      ],
      names: {
        english: "Nomad's Kit",
        portuguese: 'Kit do Nômade',
        spanish: 'Kit del Nómada',
      },
      descriptions: {
        english: 'Bow, spyglass, and rope — the desert reveals its secrets to those who wander.',
        portuguese: 'Arco, luneta e corda — o deserto revela seus segredos para aqueles que vagam.',
        spanish: 'Arco, catalejo y cuerda — el desierto revela sus secretos a quienes vagan.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Mystic's Kit",
        portuguese: 'Kit do Místico',
        spanish: 'Kit del Místico',
      },
      descriptions: {
        english: 'Staff, ancient scrolls, and bottled starlight — the djinn whisper their secrets to you.',
        portuguese: 'Bordão, pergaminhos antigos e luz engarrafada — os djinn sussurram seus segredos para você.',
        spanish: 'Bastón, pergaminos antiguos y luz embotellada — los genios susurran sus secretos para ti.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Merchant's Kit",
        portuguese: 'Kit do Mercador',
        spanish: 'Kit del Mercader',
      },
      descriptions: {
        english: 'Blade, goods, and remedies — the silk road is paved with profit and peril.',
        portuguese: 'Lâmina, mercadorias e remédios — a rota da seda é pavimentada com lucro e perigo.',
        spanish: 'Cuchilla, mercancías y remedios — la ruta de la seda está pavimentada con ganancias y peligros.',
      },
    },
  ],

  'Wuxia / Martial Arts': [
    {
      archetype: 'warrior',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
        { key: 'rope', quantity: 1 },
      ],
      names: {
        english: "Warrior's Kit",
        portuguese: 'Kit do Guerreiro',
        spanish: 'Kit del Guerrero',
      },
      descriptions: {
        english: 'Staff, light armor, and discipline — your body is your ultimate weapon.',
        portuguese: 'Bordão, armadura leve e disciplina — seu corpo é sua arma definitiva.',
        spanish: 'Bastón, armadura ligera y disciplina — tu cuerpo es tu arma definitiva.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'dagger', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Wanderer's Kit",
        portuguese: 'Kit do Andarilho',
        spanish: 'Kit del Errante',
      },
      descriptions: {
        english: 'Light steps, quick blade, and open road — the jianghu is yours to explore.',
        portuguese: 'Passos leves, lâmina rápida e estrada aberta — o jianghu é seu para explorar.',
        spanish: 'Pasos ligeros, cuchilla rápida y camino abierto — el jianghu es tuyo para explorar.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Sage's Kit",
        portuguese: 'Kit do Sábio',
        spanish: 'Kit del Sabio',
      },
      descriptions: {
        english: 'Staff, ancient texts, and inner peace — wisdom is the sharpest blade.',
        portuguese: 'Bordão, textos antigos e paz interior — a sabedoria é a lâmina mais afiada.',
        spanish: 'Bastón, textos antiguos y paz interior — la sabiduría es la cuchilla más afilada.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Monk's Kit",
        portuguese: 'Kit do Monge',
        spanish: 'Kit del Monje',
      },
      descriptions: {
        english: 'Staff, herbal remedies, and discipline — endure all trials on the path to enlightenment.',
        portuguese: 'Bordão, remédios herbais e disciplina — suporte todas as provações no caminho para a iluminação.',
        spanish: 'Bastón, remedios herbales y disciplina — soporta todas las pruebas en el camino hacia la iluminación.',
      },
    },
  ],

  'Superhero / Modern Supers': [
    {
      archetype: 'warrior',
      items: [
        { key: 'combat_knife', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Vigilante's Kit",
        portuguese: 'Kit do Vigilante',
        spanish: 'Kit del Vigilante',
      },
      descriptions: {
        english: 'Tactical gear and a sidearm — by night, you patrol the mean streets.',
        portuguese: 'Equipamento tático e uma arma lateral — à noite, você patrulha as ruas perigosas.',
        spanish: 'Equipo táctico y un arma lateral — de noche, patrullas las calles peligrosas.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'pistol', quantity: 1 },
        { key: 'combat_knife', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Agent's Kit",
        portuguese: 'Kit do Agente',
        spanish: 'Kit del Agente',
      },
      descriptions: {
        english: 'Concealed weapons, lockpicks, and a vest — gather intelligence from the shadows.',
        portuguese: 'Armas ocultas, gazuas e um colete — colete informações das sombras.',
        spanish: 'Armas ocultas, ganzúas y un chaleco — recopila información desde las sombras.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'combat_knife', quantity: 1 },
        { key: 'medkit', quantity: 1 },
        { key: 'bandage', quantity: 1 },
      ],
      names: {
        english: "Technopath's Kit",
        portuguese: 'Kit do Tecnopata',
        spanish: 'Kit del Tecnópata',
      },
      descriptions: {
        english: 'Research notes, gadgets, and a medkit — knowledge is your superpower.',
        portuguese: 'Notas de pesquisa, dispositivos e um kit médico — conhecimento é seu superpoder.',
        spanish: 'Notas de investigación, dispositivos y un botiquín — el conocimiento es tu superpoder.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'medkit', quantity: 2 },
        { key: 'bandage', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'pistol', quantity: 1 },
      ],
      names: {
        english: "Sidekick's Kit",
        portuguese: 'Kit do Ajudante',
        spanish: 'Kit del Acompañante',
      },
      descriptions: {
        english: 'Multi-purpose gear and medical supplies — every hero needs a reliable partner.',
        portuguese: 'Equipamento versátil e suprimentos médicos — todo herói precisa de um parceiro confiável.',
        spanish: 'Equipo versátil y suministros médicos — todo héroe necesita un compañero fiable.',
      },
    },
  ],

  'Arthurian Legend': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'chain_shirt', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Knight's Kit",
        portuguese: 'Kit do Cavaleiro',
        spanish: 'Kit del Caballero',
      },
      descriptions: {
        english: 'Sword, shield, and chainmail — swear fealty to Camelot and ride to glory.',
        portuguese: 'Espada, escudo e cota de malha — jure lealdade a Camelot e cavalgue para a glória.',
        spanish: 'Espada, escudo y cota de malla — jura lealtad a Camelot y cabalga hacia la gloria.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'shortbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Forester's Kit",
        portuguese: 'Kit do Guarda Florestal',
        spanish: 'Kit del Guardabosques',
      },
      descriptions: {
        english: 'Bow, dagger, and survival gear — through Sherwood and beyond, you are the king\'s eyes.',
        portuguese: 'Arco, adaga e equipamento de sobrevivência — através de Sherwood e além, você é os olhos do rei.',
        spanish: 'Arco, daga y equipo de supervivencia — a través de Sherwood y más allá, eres los ojos del rey.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Merlin's Apprentice Kit",
        portuguese: 'Kit do Aprendiz de Merlin',
        spanish: 'Kit del Aprendiz de Merlín',
      },
      descriptions: {
        english: 'Staff, grimoire, and torch — the old magic stirs in the mists of Avalon.',
        portuguese: 'Bordão, grimório e tocha — a magia antiga se agita nas brumas de Avalon.',
        spanish: 'Bastón, grimorio y antorcha — la magia antigua se agita en las brumas de Avalon.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'mace', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Squire's Kit",
        portuguese: 'Kit do Escudeiro',
        spanish: 'Kit del Escudero',
      },
      descriptions: {
        english: 'Mace, supplies, and stalwart heart — every great knight started as a squire.',
        portuguese: 'Maça, suprimentos e coração valente — todo grande cavaleiro começou como escudeiro.',
        spanish: 'Maza, suministros y corazón valiente — todo gran caballero empezó como escudero.',
      },
    },
  ],

  'Zombie Survival': [
    {
      archetype: 'warrior',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'bandage', quantity: 1 },
      ],
      names: {
        english: "Brawler's Kit",
        portuguese: 'Kit do Brigão',
        spanish: 'Kit del Peleón',
      },
      descriptions: {
        english: 'Crowbar, pistol, and armor — when the horde comes, you hold the line.',
        portuguese: 'Pé de cabra, pistola e armadura — quando a horda vier, você segura a linha.',
        spanish: 'Palanca, pistola y armadura — cuando la horda llegue, tú mantienes la línea.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'crossbow', quantity: 1 },
        { key: 'combat_knife', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'bandage', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Scavenger's Kit",
        portuguese: 'Kit do Catador',
        spanish: 'Kit del Recolector',
      },
      descriptions: {
        english: 'Crossbow, lockpicks, and meds — survive by staying quiet, moving fast, and never getting cornered.',
        portuguese: 'Besta, gazuas e remédios — sobreviva ficando quieto, movendo-se rápido e nunca sendo encurralado.',
        spanish: 'Ballesta, ganzúas y medicinas — sobrevive estando quieto, moviéndote rápido y nunca siendo acorralado.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'medkit', quantity: 2 },
        { key: 'bandage', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Field Medic's Kit",
        portuguese: 'Kit do Médico de Campo',
        spanish: 'Kit del Médico de Campo',
      },
      descriptions: {
        english: 'Medical supplies and a crowbar — in the apocalypse, a good doctor is worth more than gold.',
        portuguese: 'Suprimentos médicos e um pé de cabra — no apocalipse, um bom médico vale mais que ouro.',
        spanish: 'Suministros médicos y una palanca — en el apocalipsis, un buen médico vale más que el oro.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'medkit', quantity: 2 },
      ],
      names: {
        english: "Survivor's Kit",
        portuguese: 'Kit do Sobrevivente',
        spanish: 'Kit del Superviviente',
      },
      descriptions: {
        english: 'Tools, meds, and rope — the dead rise, but the living endure.',
        portuguese: 'Ferramentas, remédios e corda — os mortos se levantam, mas os vivos persistem.',
        spanish: 'Herramientas, medicinas y cuerda — los muertos se levantan, pero los vivos persisten.',
      },
    },
  ],

  'Japanese Folklore': [
    {
      archetype: 'warrior',
      items: [
        { key: 'shortsword', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Samurai's Kit",
        portuguese: 'Kit do Samurai',
        spanish: 'Kit del Samurái',
      },
      descriptions: {
        english: 'Katana, light armor, and a torch — walk the path of the warrior with honor.',
        portuguese: 'Katana, armadura leve e uma tocha — trilhe o caminho do guerreiro com honra.',
        spanish: 'Katana, armadura ligera y una antorcha — recorre el camino del guerrero con honor.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'shortbow', quantity: 1 },
        { key: 'dagger', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'torch', quantity: 1 },
      ],
      names: {
        english: "Rōnin's Kit",
        portuguese: 'Kit do Rōnin',
        spanish: 'Kit del Rōnin',
      },
      descriptions: {
        english: 'Bow, blade, and rope — a masterless wanderer in a land of spirits and secrets.',
        portuguese: 'Arco, lâmina e corda — um andarilho sem mestre em uma terra de espíritos e segredos.',
        spanish: 'Arco, cuchilla y cuerda — un vagabundo sin amo en una tierra de espíritus y secretos.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Onmyōji's Kit",
        portuguese: 'Kit do Onmyōji',
        spanish: 'Kit del Onmyōji',
      },
      descriptions: {
        english: 'Staff, wards, and spirit charms — the veil between worlds is thin, and you walk both sides.',
        portuguese: 'Bordão, selos e amuletos espirituais — o véu entre mundos é fino, e você anda em ambos.',
        spanish: 'Bastón, sellos y amuletos espirituales — el velo entre mundos es fino, y caminas en ambos.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Monk's Kit",
        portuguese: 'Kit do Monge',
        spanish: 'Kit del Monje',
      },
      descriptions: {
        english: 'Staff, herbal remedies, and prayer beads — the yokai fear those with inner peace.',
        portuguese: 'Bordão, remédios herbais e contas de oração — os yokai temem aqueles com paz interior.',
        spanish: 'Bastón, remedios herbales y cuentas de oración — los yokai temen a aquellos con paz interior.',
      },
    },
  ],

  'Space Horror': [
    {
      archetype: 'warrior',
      items: [
        { key: 'combat_knife', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'reinforced_vest', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Marine's Kit",
        portuguese: 'Kit do Fuzileiro',
        spanish: 'Kit del Infante de Marina',
      },
      descriptions: {
        english: 'Combat knife, pistol, and armor — standard issue for deep space deployment.',
        portuguese: 'Faca de combate, pistola e armadura — equipamento padrão para implantação no espaço profundo.',
        spanish: 'Cuchillo de combate, pistola y armadura — equipo estándar para despliegue en el espacio profundo.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'pistol', quantity: 1 },
        { key: 'crowbar', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'medkit', quantity: 1 },
      ],
      names: {
        english: "Engineer's Kit",
        portuguese: 'Kit do Engenheiro',
        spanish: 'Kit del Ingeniero',
      },
      descriptions: {
        english: 'Pistol, tools, and a torch — the derelict ship holds secrets best left buried.',
        portuguese: 'Pistola, ferramentas e uma tocha — a nave abandonada guarda segredos que é melhor deixar enterrados.',
        spanish: 'Pistola, herramientas y una antorcha — la nave abandonada guarda secretos que es mejor dejar enterrados.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'cyberdeck', quantity: 1 },
        { key: 'pistol', quantity: 1 },
        { key: 'medkit', quantity: 1 },
        { key: 'lockpicks', quantity: 1 },
      ],
      names: {
        english: "Scientist's Kit",
        portuguese: 'Kit do Cientista',
        spanish: 'Kit del Científico',
      },
      descriptions: {
        english: 'Data deck, sidearm, and meds — out here, the research writes itself in blood.',
        portuguese: 'Ciberdeck, arma lateral e remédios — aqui fora, a pesquisa se escreve com sangue.',
        spanish: 'Ciberdeck, arma lateral y medicinas — aquí afuera, la investigación se escribe con sangre.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'medkit', quantity: 2 },
        { key: 'bandage', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'pistol', quantity: 1 },
      ],
      names: {
        english: "Survivor's Kit",
        portuguese: 'Kit do Sobrevivente',
        spanish: 'Kit del Superviviente',
      },
      descriptions: {
        english: 'Crowbar, medkits, and a sidearm — in deep space, there is no backup. Only survival.',
        portuguese: 'Pé de cabra, kits médicos e uma arma lateral — no espaço profundo, não há reforços. Apenas sobrevivência.',
        spanish: 'Palanca, botiquines y un arma lateral — en el espacio profundo, no hay refuerzos. Solo supervivencia.',
      },
    },
  ],

  'Post-Magic Apocalypse': [
    {
      archetype: 'warrior',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'shield', quantity: 1 },
        { key: 'leather_armor', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Reclaimer's Kit",
        portuguese: 'Kit do Recuperador',
        spanish: 'Kit del Recuperador',
      },
      descriptions: {
        english: 'Staff, shield, and armor — the shattered world needs those who will rebuild it.',
        portuguese: 'Bordão, escudo e armadura — o mundo estilhaçado precisa daqueles que o reconstruirão.',
        spanish: 'Bastón, escudo y armadura — el mundo destrozado necesita a quienes lo reconstruirán.',
      },
    },
    {
      archetype: 'scout',
      items: [
        { key: 'shortbow', quantity: 1 },
        { key: 'crowbar', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'healing_potion', quantity: 1 },
      ],
      names: {
        english: "Wasteland Scout's Kit",
        portuguese: 'Kit do Batedor dos Ermos',
        spanish: 'Kit del Explorador del Páramo',
      },
      descriptions: {
        english: 'Bow, crowbar, and rope — across floating islands and broken lands, you chart the new world.',
        portuguese: 'Arco, pé de cabra e corda — através de ilhas flutuantes e terras quebradas, você mapeia o novo mundo.',
        spanish: 'Arco, palanca y cuerda — a través de islas flotantes y tierras rotas, trazas el nuevo mundo.',
      },
    },
    {
      archetype: 'scholar',
      items: [
        { key: 'quarterstaff', quantity: 1 },
        { key: 'arcane_grimoire', quantity: 1 },
        { key: 'torch', quantity: 1 },
        { key: 'antidote', quantity: 1 },
      ],
      names: {
        english: "Wild Mage's Kit",
        portuguese: 'Kit do Mago Selvagem',
        spanish: 'Kit del Mago Salvaje',
      },
      descriptions: {
        english: 'Staff, grimoire, and protective charms — magic is wild now, but you remember the old ways.',
        portuguese: 'Bordão, grimório e amuletos de proteção — a magia agora é selvagem, mas você se lembra dos caminhos antigos.',
        spanish: 'Bastón, grimorio y amuletos de protección — la magia ahora es salvaje, pero recuerdas los caminos antiguos.',
      },
    },
    {
      archetype: 'survivor',
      items: [
        { key: 'crowbar', quantity: 1 },
        { key: 'bandage', quantity: 2 },
        { key: 'antidote', quantity: 1 },
        { key: 'rope', quantity: 1 },
        { key: 'healing_potion', quantity: 2 },
      ],
      names: {
        english: "Dweller's Kit",
        portuguese: 'Kit do Morador',
        spanish: 'Kit del Morador',
      },
      descriptions: {
        english: 'Tools, meds, and grit — you survived the collapse. The rest is just another day.',
        portuguese: 'Ferramentas, remédios e coragem — você sobreviveu ao colapso. O resto é só mais um dia.',
        spanish: 'Herramientas, medicinas y coraje — sobreviviste al colapso. El resto es solo otro día.',
      },
    },
  ],
};

function resolveThemeLabel(campaignTheme: string): string {
  const lower = campaignTheme.toLowerCase();

  if (lower.includes('medieval fantasy') || (lower.includes('mythical') && lower.includes('kingdom')) || lower.includes('magic') && lower.includes('ruins')) return 'Medieval Fantasy';
  if (lower.includes('lovecraftian') || lower.includes('cosmic horror') || lower.includes('forbidden knowledge')) return 'Lovecraftian Horror';
  if (lower.includes('cyberpunk') || lower.includes('neon-lit') || lower.includes('mega-corporation')) return 'Cyberpunk';
  if (lower.includes('dark souls') || lower.includes('gothic dark') || (lower.includes('curses') && lower.includes('bleak'))) return 'Dark Souls / Gothic Dark Fantasy';
  if (lower.includes('pirate') || lower.includes('treasure map') || (lower.includes('sea') && lower.includes('ocean'))) return 'Pirate Adventure';
  if (lower.includes('steampunk') || lower.includes('victorian') || lower.includes('steam-powered')) return 'Steampunk';
  if (lower.includes('sci-fi') || lower.includes('space opera') || lower.includes('interstellar') || lower.includes('alien')) return 'Sci-Fi / Space Opera';
  if (lower.includes('weird west') || lower.includes('cowboy') || lower.includes('dusty') || lower.includes('frontier')) return 'Weird West';
  if (lower.includes('post-apocalyptic') || lower.includes('ashes') || lower.includes('radiation') || lower.includes('mutant')) return 'Post-Apocalyptic';
  if (lower.includes('norse') || lower.includes('valkyrie') || lower.includes('ragnar') || lower.includes('yggdrasil')) return 'Norse Mythology';
  if (lower.includes('arabian') || lower.includes('djinn') || lower.includes('sultan') || lower.includes('desert')) return 'Arabian Nights';
  if (lower.includes('wuxia') || lower.includes('martial artist') || lower.includes('clan') || lower.includes('jianghu')) return 'Wuxia / Martial Arts';
  if (lower.includes('superhero') || lower.includes('superpowered') || lower.includes('cape') || lower.includes('heroe')) return 'Superhero / Modern Supers';
  if (lower.includes('arthurian') || lower.includes('camelot') || lower.includes('round table') || lower.includes('avalon')) return 'Arthurian Legend';
  if (lower.includes('zombie') || lower.includes('undead') || lower.includes('outbreak') || lower.includes('survivor')) return 'Zombie Survival';
  if (lower.includes('japanese') || lower.includes('yokai') || lower.includes('kami') || lower.includes('shrine')) return 'Japanese Folklore';
  if (lower.includes('space horror') || lower.includes('derelict ship') || lower.includes('deep space') || lower.includes('silent')) return 'Space Horror';
  if (lower.includes('post-magic') || lower.includes('floating island') || lower.includes('magic once') || lower.includes('realty bend')) return 'Post-Magic Apocalypse';

  return 'Medieval Fantasy';
}

export function getKitItemEntries(campaignTheme: string, kitId: string): KitItemEntry[] {
  const label = resolveThemeLabel(campaignTheme);
  const overrides = THEME_OVERRIDES[label] || [];

  const archetype = ARCHETYPES.find(a => a.id === kitId);
  if (!archetype) return [];

  const override = overrides.find(o => o.archetype === kitId);
  return override?.items || archetype.defaultItems;
}

export function getKitsForTheme(campaignTheme: string, language: NarrativeLanguage): ResolvedKit[] {
  const label = resolveThemeLabel(campaignTheme);
  const overrides = THEME_OVERRIDES[label] || [];

  return ARCHETYPES.map((archetype) => {
    const override = overrides.find(o => o.archetype === archetype.id);

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
