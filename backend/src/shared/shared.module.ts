import { Global, Module } from '@nestjs/common';
import { GameState } from '../game/game.state';
import { DiceService } from '../game/dice.service';

@Global()
@Module({
  providers: [GameState, DiceService],
  exports: [GameState, DiceService],
})
export class SharedModule {}
