import { Injectable } from '@nestjs/common';

@Injectable()
export class DiceService {
  rollDice(sides: number = 20): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  rollDiceFormula(formula: string): number {
    const diceMatch = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (diceMatch) {
      const diceCount = parseInt(diceMatch[1], 10);
      const diceFaces = parseInt(diceMatch[2], 10);
      const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;

      let total = modifier;
      for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * diceFaces) + 1;
      }
      return Math.max(0, total);
    }

    const fixed = parseInt(formula, 10);
    if (!isNaN(fixed)) return Math.max(0, fixed);
    return 0;
  }
}
