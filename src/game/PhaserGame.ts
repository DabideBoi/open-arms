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
    backgroundColor: '#0d1017',
    // Scene is added explicitly (with game state) after boot — see below.
    render: {
      antialias: true,
      antialiasGL: true,
      roundPixels: false,     // allow sub-pixel positions so slow, smooth motion doesn't stair-step
      pixelArt: false,
      powerPreference: 'high-performance'
    },
    fps: {
      target: 60,
      min: 30,
      smoothStep: true
    },
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

  // Add and start the scene once, WITH the game state, instead of letting it
  // auto-start data-less and then restarting it. This avoids a throwaway
  // data-less create() (and its duplicate asset preload) and, crucially, means
  // there's no deferred restart that could fire against an already-destroyed
  // game (React StrictMode double-mounts in dev), which previously spawned a
  // camera-less "zombie" scene that spammed errors every frame.
  game.scene.add('MainScene', MainScene, true, { gameStateManager });

  return game;
}

/**
 * Destroy the Phaser game instance
 */
export function destroyPhaserGame(game: Phaser.Game) {
  game.destroy(true);
}
