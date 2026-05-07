import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { GameStateManager } from './systems/GameStateManager';
import { GRID_CONFIG } from '../constants';

/**
 * Create and configure the Phaser game instance
 */
export function createPhaserGame(
  parent: string | HTMLElement,
  gameStateManager: GameStateManager
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent,
    backgroundColor: '#1a1a1a',
    scene: [MainScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };
  
  const game = new Phaser.Game(config);
  
  // The scene auto-starts from config, but we need to restart it with data
  // Wait a tick for the scene to be added, then restart with gameStateManager
  setTimeout(() => {
    game.scene.stop('MainScene');
    game.scene.start('MainScene', { gameStateManager });
  }, 0);
  
  return game;
}

/**
 * Destroy the Phaser game instance
 */
export function destroyPhaserGame(game: Phaser.Game) {
  game.destroy(true);
}
