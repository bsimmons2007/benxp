window.__phaserGame = new Phaser.Game({
  type:            Phaser.AUTO,
  width:           ARENA.width,
  height:          ARENA.height,
  backgroundColor: '#0a0d0e',
  parent:          document.body,
  resolution:      window.devicePixelRatio || 1,
  antialias:       true,
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, ResultScene],
});
