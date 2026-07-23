import {
  Skull,
  Fire,
  Star,
  Close,
  Zap,
  CloudMoon,
  Lock,
  Moon,
  Circle,
  Sword,
  Human,
  Potion,
  BookOpen,
  Box,
  Target,
  Heart,
  Crown,
} from "pixelarticons/react";
import { Player } from "../../types/game.types";

export const CONDITION_ICONS: Record<
  string,
  React.ComponentType<{ width?: number; height?: number; className?: string }>
> = {
  Poisoned: Skull,
  Burning: Fire,
  Blessed: Star,
  Cursed: Close,
  Stunned: Zap,
  Frozen: CloudMoon,
  Paralyzed: Lock,
  Unconscious: Moon,
};

export const ITEM_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ width?: number; height?: number; className?: string }>
> = {
  weapon: Sword,
  armor: Human,
  potion: Potion,
  scroll: BookOpen,
  key_item: Star,
  misc: Box,
};

export const ATTRIBUTE_ICONS: Record<
  keyof Player["attributes"],
  {
    label: string;
    icon: React.ComponentType<{
      width?: number;
      height?: number;
      className?: string;
    }>;
  }
> = {
  strength: { label: "STR", icon: Sword },
  dexterity: { label: "DEX", icon: Target },
  constitution: { label: "CON", icon: Heart },
  intelligence: { label: "INT", icon: BookOpen },
  wisdom: { label: "WIS", icon: Star },
  charisma: { label: "CHA", icon: Crown },
};

export const ATTRIB_KEYS = Object.keys(ATTRIBUTE_ICONS) as Array<
  keyof Player["attributes"]
>;
