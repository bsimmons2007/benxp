// BootScene — first scene Phaser loads.
// Preloads any external assets, then hands off to the menu.

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // All graphics are drawn procedurally. Audio is generated via Web Audio API
    // in GameScene._playSound — no preloaded assets needed.
  }

  create() {
    this.scene.start('MenuScene');
  }
}
