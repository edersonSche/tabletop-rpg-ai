import { NarrativeLanguage, Effect } from '../game/game.state';

export interface ItemTranslation {
  name: string;
  description: string;
}

export interface ItemDefinition {
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'key_item' | 'misc';
  slot?: 'body' | 'hand' | 'two-handed';
  effects: Effect[];
  coins?: number;
  antidoteFor?: string;
  translations: Record<NarrativeLanguage, ItemTranslation>;
}

const ITEMS: Record<string, ItemDefinition> = {
  dagger: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 1, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Dagger', description: 'A short, sharp blade, useful for combat or everyday tasks.' },
      portuguese: { name: 'Adaga', description: 'Uma lâmina curta e afiada, útil para combate ou tarefas cotidianas.' },
      spanish: { name: 'Daga', description: 'Una hoja corta y afilada, útil para el combate o tareas cotidianas.' },
    },
  },

  shortsword: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Shortsword', description: 'A sturdy steel blade, balanced for quick strikes and reliable in a fight.' },
      portuguese: { name: 'Espada Curta', description: 'Uma lâmina robusta de aço, equilibrada para golpes rápidos e confiável em combate.' },
      spanish: { name: 'Espada Corta', description: 'Una hoja robusta de acero, equilibrada para golpes rápidos y fiable en el combate.' },
    },
  },

  battleaxe: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 3, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Battleaxe', description: 'A heavy, brutal axe head on a solid haft. Requires strength to wield effectively.' },
      portuguese: { name: 'Machado de Batalha', description: 'Uma cabeça de machado pesada e brutal em um cabo sólido. Exige força para ser empunhado.' },
      spanish: { name: 'Hacha de Batalla', description: 'Una cabeza de hacha pesada y brutal en un mango sólido. Exige fuerza para ser empuñada.' },
    },
  },

  rapier: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Rapier', description: 'A slender, pointed sword built for precision thrusts and agile footwork.' },
      portuguese: { name: 'Rapieira', description: 'Uma espada esbelta e pontiaguda, feita para estocadas de precisão e jogo de pés ágil.' },
      spanish: { name: 'Estoque', description: 'Una espada esbelta y puntiaguda, hecha para estocadas de precisión y juego de pies ágil.' },
    },
  },

  quarterstaff: {
    type: 'weapon',
    slot: 'two-handed',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 1, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Quarterstaff', description: 'A long wooden staff, simple yet versatile — useful for combat or as a walking aid.' },
      portuguese: { name: 'Bordão', description: 'Um longo bastão de madeira, simples porém versátil — útil para combate ou como apoio.' },
      spanish: { name: 'Bastón', description: 'Un largo bastón de madera, simple pero versátil — útil para el combate o como apoyo.' },
    },
  },

  shortbow: {
    type: 'weapon',
    slot: 'two-handed',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Shortbow', description: 'A compact bow of carved wood, easy to carry and quick to draw in the wild.' },
      portuguese: { name: 'Arco Curto', description: 'Um arco compacto de madeira entalhada, fácil de carregar e rápido de sacar na natureza.' },
      spanish: { name: 'Arco Corto', description: 'Un arco compacto de madera tallada, fácil de llevar y rápido de desenvainar en la naturaleza.' },
    },
  },

  crossbow: {
    type: 'weapon',
    slot: 'two-handed',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 3, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Crossbow', description: 'A mechanical bow that fires bolts with deadly force. Slow to reload but devastating.' },
      portuguese: { name: 'Besta', description: 'Um arco mecânico que dispara virotes com força letal. Lento para recarregar, mas devastador.' },
      spanish: { name: 'Ballesta', description: 'Un arco mecánico que dispara virotes con fuerza letal. Lento de recargar, pero devastador.' },
    },
  },

  pistol: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Pistol', description: 'A compact firearm, easy to conceal and reliable at close to medium range.' },
      portuguese: { name: 'Pistola', description: 'Uma arma de fogo compacta, fácil de ocultar e confiável em curto e médio alcance.' },
      spanish: { name: 'Pistola', description: 'Un arma de fuego compacta, fácil de ocultar y fiable a corto y medio alcance.' },
    },
  },

  revolver: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 3, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Revolver', description: 'A six-shooter with a heavy punch. Slower to reload, but each shot counts.' },
      portuguese: { name: 'Revólver', description: 'Um de seis tiros com poder de fogo pesado. Lento para recarregar, mas cada disparo conta.' },
      spanish: { name: 'Revólver', description: 'Un arma de seis tiros con gran poder de fuego. Lento de recargar, pero cada disparo cuenta.' },
    },
  },

  combat_knife: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 1, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Tactical Knife', description: 'A modern combat knife with a serrated edge and ergonomic grip. Built for close quarters.' },
      portuguese: { name: 'Faca Tática', description: 'Uma faca de combate moderna com lâmina serrilhada e empunhadura ergonômica. Feita para combate próximo.' },
      spanish: { name: 'Cuchillo Táctico', description: 'Un cuchillo de combate moderno con hoja serrada y empuñadura ergonómica. Hecho para combate cercano.' },
    },
  },

  crowbar: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 1, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Crowbar', description: 'A sturdy iron bar with a curved claw. A tool for prying, breaking, and surviving.' },
      portuguese: { name: 'Pé de Cabra', description: 'Uma barra de ferro resistente com uma ponta curva. Ferramenta para forçar, quebrar e sobreviver.' },
      spanish: { name: 'Palanca', description: 'Una barra de hierro resistente con una punta curva. Herramienta para forzar, romper y sobrevivir.' },
    },
  },

  mace: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Mace', description: 'A heavy metal head on a sturdy shaft. Crushes armor and bones with equal ease.' },
      portuguese: { name: 'Maça', description: 'Uma cabeça de metal pesada em um cabo resistente. Esmaga armaduras e ossos com igual facilidade.' },
      spanish: { name: 'Maza', description: 'Una cabeza de metal pesada en un mango resistente. Aplasta armaduras y huesos con igual facilidad.' },
    },
  },

  shock_baton: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 1, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Shock Baton', description: 'An electrified baton that delivers a non-lethal stunning jolt on contact.' },
      portuguese: { name: 'Bastão Elétrico', description: 'Um bastão eletrificado que desfere um choque atordoante não letal ao contato.' },
      spanish: { name: 'Bastón Eléctrico', description: 'Un bastón electrificado que descarga un choque aturdidor no letal al contacto.' },
    },
  },

  flintlock: {
    type: 'weapon',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'damage', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Flintlock Pistol', description: 'A single-shot muzzleloader pistol. Unreliable but devastating at close range.' },
      portuguese: { name: 'Pistola de Pederneira', description: 'Uma pistola de carregamento pela boca de tiro único. Não confiável, mas devastadora à queima-roupa.' },
      spanish: { name: 'Pistola de Chispa', description: 'Una pistola de avancarga de un solo disparo. Poco fiable pero devastadora a corta distancia.' },
    },
  },

  leather_armor: {
    type: 'armor',
    slot: 'body',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'ac', value: 1, operation: 'add', dexCap: 999 }], origin: 'item' }],
    translations: {
      english: { name: 'Leather Armor', description: 'Tough animal hide, treated and shaped for protection. Light and flexible.' },
      portuguese: { name: 'Armadura de Couro', description: 'Couro resistente de animal, tratado e moldado para proteção. Leve e flexível.' },
      spanish: { name: 'Armadura de Cuero', description: 'Cuero resistente de animal, tratado y moldeado para protección. Ligera y flexible.' },
    },
  },

  chain_shirt: {
    type: 'armor',
    slot: 'body',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'ac', value: 2, operation: 'add', dexCap: 2 }], origin: 'item' }],
    translations: {
      english: { name: 'Chain Shirt', description: 'A shirt of interlocking metal rings. Offers solid protection without sacrificing mobility.' },
      portuguese: { name: 'Cota de Malha', description: 'Uma camisa de anéis de metal entrelaçados. Oferece proteção sólida sem sacrificar a mobilidade.' },
      spanish: { name: 'Cota de Malla', description: 'Una camisa de anillos de metal entrelazados. Ofrece protección sólida sin sacrificar la movilidad.' },
    },
  },

  reinforced_vest: {
    type: 'armor',
    slot: 'body',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'ac', value: 2, operation: 'add', dexCap: 2 }], origin: 'item' }],
    translations: {
      english: { name: 'Reinforced Vest', description: 'A ballistic vest with impact-resistant plates. Standard issue for urban survival.' },
      portuguese: { name: 'Colete Reforçado', description: 'Um colete balístico com placas resistentes a impacto. Padrão para sobrevivência urbana.' },
      spanish: { name: 'Chaleco Reforzado', description: 'Un chaleco balístico con placas resistentes al impacto. Estándar para la supervivencia urbana.' },
    },
  },

  shield: {
    type: 'armor',
    slot: 'hand',
    effects: [{ type: 'permanent', statModifiers: [{ target: 'ac', value: 2, operation: 'add' }], origin: 'item' }],
    translations: {
      english: { name: 'Shield', description: 'A wooden or metal shield strapped to the arm. Essential for blocking blows.' },
      portuguese: { name: 'Escudo', description: 'Um escudo de madeira ou metal preso ao braço. Essencial para bloquear golpes.' },
      spanish: { name: 'Escudo', description: 'Un escudo de madera o metal sujeto al brazo. Esencial para bloquear golpes.' },
    },
  },

  arcane_grimoire: {
    type: 'misc',
    slot: 'hand',
    effects: [],
    translations: {
      english: { name: 'Arcane Grimoire', description: 'A leather-bound tome of eldritch knowledge. Crackling with latent magical energy.' },
      portuguese: { name: 'Grimório Arcano', description: 'Um livro encadernado em couro de conhecimento arcano. Estalando com energia mágica latente.' },
      spanish: { name: 'Grimorio Arcano', description: 'Un libro encuadernado en cuero de conocimiento arcano. Chispeante con energía mágica latente.' },
    },
  },

  cyberdeck: {
    type: 'misc',
    slot: 'hand',
    effects: [],
    translations: {
      english: { name: 'Cyberdeck', description: 'A portable computing rig with neural interface. Your gateway to the digital realm.' },
      portuguese: { name: 'Ciberdeck', description: 'Um equipamento de computação portátil com interface neural. Seu portal para o reino digital.' },
      spanish: { name: 'Ciberdeck', description: 'Un equipo de computación portátil con interfaz neural. Tu puerta de entrada al reino digital.' },
    },
  },

  holy_symbol: {
    type: 'misc',
    slot: 'hand',
    effects: [],
    translations: {
      english: { name: 'Holy Symbol', description: 'A divine icon of a deity or faith. Radiates calming energy for those who believe.' },
      portuguese: { name: 'Símbolo Sagrado', description: 'Um ícone divino de uma divindade ou fé. Irradia energia calmante para aqueles que creem.' },
      spanish: { name: 'Símbolo Sagrado', description: 'Un icono divino de una deidad o fe. Irradia energía calmante para aquellos que creen.' },
    },
  },

  healing_potion: {
    type: 'potion',
    effects: [{ type: 'immediate', hpChange: { formula: '2d4+2', type: 'heal' }, origin: 'item' }],
    translations: {
      english: { name: 'Healing Potion', description: 'A smoking red liquid that restores vigor when drunk.' },
      portuguese: { name: 'Poção de Cura', description: 'Um líquido vermelho fumegante que restaura o vigor quando bebido.' },
      spanish: { name: 'Poción de Curación', description: 'Un líquido rojo humeante que restaura el vigor al beberlo.' },
    },
  },

  antidote: {
    type: 'potion',
    effects: [],
    antidoteFor: 'Poisoned',
    translations: {
      english: { name: 'Antidote', description: 'A bitter green tonic that neutralizes most common poisons and toxins.' },
      portuguese: { name: 'Antídoto', description: 'Um tônico verde amargo que neutraliza a maioria dos venenos e toxinas comuns.' },
      spanish: { name: 'Antídoto', description: 'Un tónico verde amargo que neutraliza la mayoría de los venenos y toxinas comunes.' },
    },
  },

  bandage: {
    type: 'misc',
    effects: [{ type: 'immediate', hpChange: { formula: '1d4', type: 'heal' }, origin: 'item' }],
    translations: {
      english: { name: 'Bandage', description: 'Clean cloth strips for dressing wounds. Simple but life-saving in the field.' },
      portuguese: { name: 'Atadura', description: 'Tiras de pano limpas para curar ferimentos. Simples, mas salva vidas em campo.' },
      spanish: { name: 'Venda', description: 'Tiras de tela limpias para vendar heridas. Simple pero salva vidas en el campo.' },
    },
  },

  medkit: {
    type: 'potion',
    effects: [{ type: 'immediate', hpChange: { formula: '2d4+4', type: 'heal' }, origin: 'item' }],
    translations: {
      english: { name: 'Medkit', description: 'A compact medical kit with antiseptics, stimulants, and advanced bandages.' },
      portuguese: { name: 'Kit Médico', description: 'Um kit médico compacto com antissépticos, estimulantes e ataduras avançadas.' },
      spanish: { name: 'Botiquín', description: 'Un botiquín compacto con antisépticos, estimulantes y vendas avanzadas.' },
    },
  },

  torch: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Torch', description: 'A wooden stick wrapped in oil-soaked cloth. Burns for about an hour of exploration.' },
      portuguese: { name: 'Tocha', description: 'Um bastão de madeira envolto em pano embebido em óleo. Queima por cerca de uma hora de exploração.' },
      spanish: { name: 'Antorcha', description: 'Un bastón de madera envuelto en tela empapada en aceite. Arde durante aproximadamente una hora de exploración.' },
    },
  },

  rope: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Rope', description: 'A 50-foot coil of braided hemp rope. Strong enough for climbing, binding, or hauling.' },
      portuguese: { name: 'Corda', description: 'Um novelo de 15 metros de corda de cânhamo trançado. Forte o suficiente para escalar, amarrar ou puxar.' },
      spanish: { name: 'Cuerda', description: 'Un rollo de 15 metros de cuerda de cáñamo trenzado. Suficientemente fuerte para escalar, atar o tirar.' },
    },
  },

  lockpicks: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Lockpicks', description: 'A small leather pouch with fine metal tools for picking locks and disarming traps.' },
      portuguese: { name: 'Gazuas', description: 'Uma pequena bolsa de couro com ferramentas de metal finas para abrir fechaduras e desarmar armadilhas.' },
      spanish: { name: 'Ganzúas', description: 'Una pequeña bolsa de cuero con finas herramientas de metal para abrir cerraduras y desarmar trampas.' },
    },
  },

  spyglass: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Spyglass', description: 'A brass telescope that extends to reveal distant details. Valuable for scouts and navigators.' },
      portuguese: { name: 'Luneta', description: 'Um telescópio de latão que se estende para revelar detalhes distantes. Valioso para batedores e navegadores.' },
      spanish: { name: 'Catalejo', description: 'Un catalejo de latón que se extiende para revelar detalles distantes. Valioso para exploradores y navegantes.' },
    },
  },

  oil_flask: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Flask of Oil', description: 'A ceramic flask filled with lamp oil. Useful for fuel, light, or makeshift traps.' },
      portuguese: { name: 'Frasco de Óleo', description: 'Um frasco de cerâmica cheio de óleo de lamparina. Útil como combustível, iluminação ou armadilhas improvisadas.' },
      spanish: { name: 'Frasco de Aceite', description: 'Un frasco de cerámica lleno de aceite de lámpara. Útil como combustible, iluminación o trampas improvisadas.' },
    },
  },

  map_case: {
    type: 'misc',
    effects: [],
    translations: {
      english: { name: 'Map Case', description: 'A waterproof leather case holding detailed charts and navigational notes.' },
      portuguese: { name: 'Porta-Mapas', description: 'Um estojo de couro impermeável contendo cartas detalhadas e anotações de navegação.' },
      spanish: { name: 'Portamapas', description: 'Un estuche de cuero impermeable que contiene mapas detallados y notas de navegación.' },
    },
  },
};

export function getItemDefinition(key: string): ItemDefinition | undefined {
  return ITEMS[key];
}

export function getLocalizedItem(key: string, language: NarrativeLanguage, quantity = 1) {
  const def = ITEMS[key];
  if (!def) return undefined;

  const t = def.translations[language] || def.translations.english;

  return {
    name: t.name,
    description: t.description,
    type: def.type,
    quantity,
    slot: def.slot,
    effects: def.effects,
    antidoteFor: def.antidoteFor,
  };
}

export function getItemKeys(): string[] {
  return Object.keys(ITEMS);
}

export default ITEMS;
